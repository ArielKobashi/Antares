import { Prisma, prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";

export const maintenanceRouter = Router();

maintenanceRouter.use(requireAuth);

maintenanceRouter.get(
  "/assets",
  requirePermission("patrimonio:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.asset.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { maintenanceOrders: { orderBy: { createdAt: "desc" }, take: 3 } },
      orderBy: { name: "asc" }
    }));
  })
);

maintenanceRouter.post(
  "/assets",
  requirePermission("patrimonio:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      assetNumber: z.string().min(1),
      name: z.string().min(2),
      type: z.string().min(2),
      location: z.string().optional(),
      acquisitionDate: z.coerce.date().optional(),
      value: z.coerce.number().min(0).optional(),
      usefulLifeMonths: z.coerce.number().int().positive().optional()
    }).parse(request.body);

    const asset = await prisma.asset.create({
      data: { ...input, companyId: request.auth!.companyId }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Asset",
      entityId: asset.id,
      newValues: asset
    });

    response.status(201).json(asset);
  })
);

maintenanceRouter.get(
  "/orders",
  requirePermission("manutencao:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.maintenanceOrder.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { asset: true, parts: { include: { product: true, warehouse: true } } },
      orderBy: { createdAt: "desc" }
    }));
  })
);

maintenanceRouter.post(
  "/orders",
  requirePermission("manutencao:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      assetId: z.string().uuid(),
      type: z.enum(["CORRETIVA", "PREVENTIVA", "PREDITIVA"]),
      priority: z.string().default("NORMAL"),
      responsible: z.string().optional(),
      description: z.string().min(3),
      scheduledAt: z.coerce.date().optional(),
      parts: z.array(z.object({
        productId: z.string().uuid(),
        warehouseId: z.string().uuid(),
        quantity: z.coerce.number().positive()
      })).default([])
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const asset = await prisma.asset.findFirst({ where: { id: input.assetId, companyId, deletedAt: null } });
    if (!asset) throw new AppError("ASSET_NOT_FOUND", "Patrimonio nao encontrado.", 404);

    for (const part of input.parts) {
      await ensureProductAndWarehouse(companyId, part.productId, part.warehouseId);
    }

    const count = await prisma.maintenanceOrder.count({ where: { companyId } });
    const order = await prisma.maintenanceOrder.create({
      data: {
        companyId,
        assetId: asset.id,
        number: `OS-${String(count + 1).padStart(6, "0")}`,
        type: input.type,
        priority: input.priority,
        responsible: input.responsible,
        description: input.description,
        scheduledAt: input.scheduledAt,
        createdBy: request.auth!.userId,
        parts: { createMany: { data: input.parts } }
      },
      include: { asset: true, parts: { include: { product: true, warehouse: true } } }
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "MaintenanceOrder",
      entityId: order.id,
      newValues: order
    });

    response.status(201).json(order);
  })
);

maintenanceRouter.post(
  "/orders/:id/close",
  requirePermission("manutencao:approve"),
  asyncHandler(async (request, response) => {
    const companyId = request.auth!.companyId;
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceOrder.findFirst({
        where: { id: request.params.id, companyId, deletedAt: null },
        include: { asset: true, parts: { include: { product: true, warehouse: true } } }
      });
      if (!existing) throw new AppError("MAINTENANCE_ORDER_NOT_FOUND", "Ordem de servico nao encontrada.", 404);
      if (existing.status === "CLOSED") throw new AppError("MAINTENANCE_ORDER_CLOSED", "Ordem de servico ja encerrada.", 409);

      if (existing.parts.length > 0) {
        const firstPart = existing.parts[0]!;
        const movement = await tx.stockMovement.create({
          data: {
            companyId,
            type: "CONSUMO_INTERNO",
            fromWarehouseId: firstPart.warehouseId,
            reason: `Pecas utilizadas na OS ${existing.number}`,
            documentRef: existing.number,
            createdBy: request.auth!.userId
          }
        });

        for (const part of existing.parts) {
          await applyBalanceChange(tx, {
            movementId: movement.id,
            productId: part.productId,
            warehouseId: part.warehouseId,
            quantity: Number(part.quantity)
          });
        }
      }

      return tx.maintenanceOrder.update({
        where: { id: existing.id },
        data: { status: "CLOSED", closedBy: request.auth!.userId, closedAt: new Date() },
        include: { asset: true, parts: { include: { product: true, warehouse: true } } }
      });
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "close",
      entity: "MaintenanceOrder",
      entityId: order.id,
      newValues: order
    });

    response.json(order);
  })
);

type Tx = Prisma.TransactionClient;

async function ensureProductAndWarehouse(companyId: string, productId: string, warehouseId: string) {
  const [product, warehouse] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, companyId, deletedAt: null } }),
    prisma.warehouse.findFirst({ where: { id: warehouseId, companyId, deletedAt: null } })
  ]);
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", "Produto nao encontrado.", 404);
  if (!warehouse) throw new AppError("WAREHOUSE_NOT_FOUND", "Estoque nao encontrado.", 404);
}

async function applyBalanceChange(
  tx: Tx,
  input: { movementId: string; productId: string; warehouseId: string; quantity: number }
) {
  const existing = await tx.stockBalance.findFirst({
    where: { productId: input.productId, warehouseId: input.warehouseId, locationId: null, batchId: null }
  });
  const previous = Number(existing?.quantity ?? 0);
  const next = previous - input.quantity;
  if (!existing || next < 0) throw new AppError("NEGATIVE_STOCK", "Saldo insuficiente para pecas da manutencao.");

  await tx.stockBalance.update({ where: { id: existing.id }, data: { quantity: next } });
  await tx.stockMovementItem.create({
    data: {
      movementId: input.movementId,
      productId: input.productId,
      quantity: input.quantity,
      previousBalance: previous,
      newBalance: next
    }
  });
}
