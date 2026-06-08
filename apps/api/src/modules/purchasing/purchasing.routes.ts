import { Prisma, prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";

export const purchasingRouter = Router();

purchasingRouter.use(requireAuth);

purchasingRouter.get(
  "/orders",
  requirePermission("compras:view"),
  asyncHandler(async (request, response) => {
    const orders = await prisma.purchaseOrder.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { supplier: true, items: { include: { product: true } }, receipts: true },
      orderBy: { createdAt: "desc" }
    });
    response.json(orders);
  })
);

purchasingRouter.post(
  "/orders",
  requirePermission("compras:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      supplierId: z.string().uuid().optional(),
      expectedAt: z.coerce.date().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        unitCost: z.coerce.number().min(0).default(0)
      })).min(1)
    }).parse(request.body);

    const companyId = request.auth!.companyId;
    const count = await prisma.purchaseOrder.count({ where: { companyId } });
    const number = `PC-${String(count + 1).padStart(6, "0")}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        companyId,
        supplierId: input.supplierId,
        number,
        expectedAt: input.expectedAt,
        notes: input.notes,
        status: "OPEN",
        createdBy: request.auth!.userId,
        items: { createMany: { data: input.items } }
      },
      include: { supplier: true, items: { include: { product: true } } }
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "PurchaseOrder",
      entityId: order.id,
      newValues: order
    });

    response.status(201).json(order);
  })
);

purchasingRouter.post(
  "/orders/:id/approve",
  requirePermission("compras:approve"),
  asyncHandler(async (request, response) => {
    const order = await prisma.purchaseOrder.update({
      where: { id: request.params.id },
      data: { status: "APPROVED" },
      include: { supplier: true, items: { include: { product: true } } }
    });
    response.json(order);
  })
);

purchasingRouter.post(
  "/orders/:id/receive",
  requirePermission("compras:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      warehouseId: z.string().uuid(),
      notes: z.string().optional()
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const receipt = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { id: request.params.id, companyId, deletedAt: null },
        include: { items: true }
      });

      if (!order) {
        throw new AppError("PURCHASE_ORDER_NOT_FOUND", "Pedido de compra nao encontrado.", 404);
      }

      if (order.status === "RECEIVED") {
        throw new AppError("PURCHASE_ORDER_RECEIVED", "Pedido ja recebido.");
      }

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          type: "ENTRADA",
          toWarehouseId: input.warehouseId,
          reason: `Recebimento do pedido ${order.number}`,
          documentRef: order.number,
          createdBy: request.auth!.userId
        }
      });

      for (const item of order.items) {
        await applyReceiptBalance(tx, {
          companyId,
          movementId: movement.id,
          productId: item.productId,
          warehouseId: input.warehouseId,
          quantity: Number(item.quantity)
        });
      }

      const createdReceipt = await tx.purchaseReceipt.create({
        data: {
          companyId,
          purchaseOrderId: order.id,
          warehouseId: input.warehouseId,
          stockMovementId: movement.id,
          receivedBy: request.auth!.userId,
          notes: input.notes
        },
        include: { purchaseOrder: { include: { items: { include: { product: true } }, supplier: true } }, warehouse: true, stockMovement: true }
      });

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "RECEIVED" }
      });

      return createdReceipt;
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "receive",
      entity: "PurchaseOrder",
      entityId: request.params.id,
      newValues: receipt
    });

    response.status(201).json(receipt);
  })
);

type Tx = Prisma.TransactionClient;

async function applyReceiptBalance(
  tx: Tx,
  input: {
    companyId: string;
    movementId: string;
    productId: string;
    warehouseId: string;
    quantity: number;
  }
) {
  const existing = await tx.stockBalance.findFirst({
    where: {
      productId: input.productId,
      warehouseId: input.warehouseId,
      locationId: null,
      batchId: null
    }
  });

  const previous = Number(existing?.quantity ?? 0);
  const next = previous + input.quantity;

  if (existing) {
    await tx.stockBalance.update({ where: { id: existing.id }, data: { quantity: next } });
  } else {
    await tx.stockBalance.create({
      data: {
        companyId: input.companyId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        quantity: next
      }
    });
  }

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
