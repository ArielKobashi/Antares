import { Prisma, prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";

export const productionRouter = Router();

productionRouter.use(requireAuth);

productionRouter.get(
  "/boms",
  requirePermission("producao:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.productionBom.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { finishedProduct: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    }));
  })
);

productionRouter.post(
  "/boms",
  requirePermission("producao:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      name: z.string().min(2),
      finishedProductId: z.string().uuid(),
      outputQuantity: z.coerce.number().positive().default(1),
      items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive()
      })).min(1)
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    await ensureProduct(companyId, input.finishedProductId);
    for (const item of input.items) await ensureProduct(companyId, item.productId);

    const bom = await prisma.productionBom.create({
      data: {
        companyId,
        name: input.name,
        finishedProductId: input.finishedProductId,
        outputQuantity: input.outputQuantity,
        items: { createMany: { data: input.items } }
      },
      include: { finishedProduct: true, items: { include: { product: true } } }
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "ProductionBom",
      entityId: bom.id,
      newValues: bom
    });

    response.status(201).json(bom);
  })
);

productionRouter.get(
  "/orders",
  requirePermission("producao:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.productionOrder.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: {
        finishedProduct: true,
        warehouse: true,
        bom: { include: { items: { include: { product: true } } } }
      },
      orderBy: { createdAt: "desc" }
    }));
  })
);

productionRouter.post(
  "/orders",
  requirePermission("producao:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      bomId: z.string().uuid(),
      warehouseId: z.string().uuid(),
      plannedQuantity: z.coerce.number().positive()
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const bom = await prisma.productionBom.findFirst({
      where: { id: input.bomId, companyId, deletedAt: null }
    });
    if (!bom) throw new AppError("BOM_NOT_FOUND", "Estrutura do produto nao encontrada.", 404);

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: input.warehouseId, companyId, deletedAt: null }
    });
    if (!warehouse) throw new AppError("WAREHOUSE_NOT_FOUND", "Estoque de producao nao encontrado.", 404);

    const count = await prisma.productionOrder.count({ where: { companyId } });
    const order = await prisma.productionOrder.create({
      data: {
        companyId,
        bomId: bom.id,
        finishedProductId: bom.finishedProductId,
        warehouseId: warehouse.id,
        number: `OP-${String(count + 1).padStart(6, "0")}`,
        plannedQuantity: input.plannedQuantity,
        status: "OPEN",
        startedBy: request.auth!.userId,
        startedAt: new Date()
      },
      include: { finishedProduct: true, warehouse: true, bom: { include: { items: { include: { product: true } } } } }
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "ProductionOrder",
      entityId: order.id,
      newValues: order
    });

    response.status(201).json(order);
  })
);

productionRouter.post(
  "/orders/:id/complete",
  requirePermission("producao:approve"),
  asyncHandler(async (request, response) => {
    const companyId = request.auth!.companyId;
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.productionOrder.findFirst({
        where: { id: request.params.id, companyId, deletedAt: null },
        include: { bom: { include: { items: true } }, finishedProduct: true, warehouse: true }
      });

      if (!existing) throw new AppError("PRODUCTION_ORDER_NOT_FOUND", "Ordem de producao nao encontrada.", 404);
      if (existing.status !== "OPEN") throw new AppError("INVALID_ORDER_STATUS", "Ordem de producao ja finalizada.", 409);
      if (!existing.bom) throw new AppError("BOM_NOT_FOUND", "Ordem sem estrutura do produto.", 404);

      const factor = Number(existing.plannedQuantity) / Number(existing.bom.outputQuantity);
      const consumeMovement = await tx.stockMovement.create({
        data: {
          companyId,
          type: "CONSUMO_INTERNO",
          fromWarehouseId: existing.warehouseId,
          reason: `Consumo da ordem ${existing.number}`,
          documentRef: existing.number,
          createdBy: request.auth!.userId
        }
      });

      for (const item of existing.bom.items) {
        await applyBalanceChange(tx, {
          companyId,
          movementId: consumeMovement.id,
          productId: item.productId,
          warehouseId: existing.warehouseId,
          quantity: -roundQuantity(Number(item.quantity) * factor)
        });
      }

      const productionMovement = await tx.stockMovement.create({
        data: {
          companyId,
          type: "PRODUCAO",
          toWarehouseId: existing.warehouseId,
          reason: `Producao da ordem ${existing.number}`,
          documentRef: existing.number,
          createdBy: request.auth!.userId
        }
      });

      await applyBalanceChange(tx, {
        companyId,
        movementId: productionMovement.id,
        productId: existing.finishedProductId,
        warehouseId: existing.warehouseId,
        quantity: Number(existing.plannedQuantity)
      });

      return tx.productionOrder.update({
        where: { id: existing.id },
        data: {
          status: "COMPLETED",
          completedBy: request.auth!.userId,
          completedAt: new Date()
        },
        include: { finishedProduct: true, warehouse: true, bom: { include: { items: { include: { product: true } } } } }
      });
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "complete",
      entity: "ProductionOrder",
      entityId: order.id,
      newValues: order
    });

    response.json(order);
  })
);

type Tx = Prisma.TransactionClient;

async function ensureProduct(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, companyId, deletedAt: null } });
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", "Produto nao encontrado.", 404);
}

async function applyBalanceChange(
  tx: Tx,
  input: { companyId: string; movementId: string; productId: string; warehouseId: string; quantity: number }
) {
  const existing = await tx.stockBalance.findFirst({
    where: { productId: input.productId, warehouseId: input.warehouseId, locationId: null, batchId: null }
  });
  const previous = Number(existing?.quantity ?? 0);
  const next = previous + input.quantity;
  if (next < 0) throw new AppError("NEGATIVE_STOCK", "Saldo insuficiente para ordem de producao.");

  if (existing) {
    await tx.stockBalance.update({ where: { id: existing.id }, data: { quantity: next } });
  } else {
    await tx.stockBalance.create({
      data: { companyId: input.companyId, productId: input.productId, warehouseId: input.warehouseId, quantity: next }
    });
  }

  await tx.stockMovementItem.create({
    data: {
      movementId: input.movementId,
      productId: input.productId,
      quantity: Math.abs(input.quantity),
      previousBalance: previous,
      newBalance: next
    }
  });
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
