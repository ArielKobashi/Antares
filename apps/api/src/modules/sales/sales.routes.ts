import { Prisma, prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get(
  "/orders",
  requirePermission("vendas:view"),
  asyncHandler(async (request, response) => {
    const orders = await prisma.salesOrder.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { customer: true, items: { include: { product: true } }, shipments: true },
      orderBy: { createdAt: "desc" }
    });
    response.json(orders);
  })
);

salesRouter.post(
  "/orders",
  requirePermission("vendas:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      customerId: z.string().uuid().optional(),
      expectedAt: z.coerce.date().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0).default(0)
      })).min(1)
    }).parse(request.body);

    const companyId = request.auth!.companyId;
    const count = await prisma.salesOrder.count({ where: { companyId } });
    const number = `PV-${String(count + 1).padStart(6, "0")}`;

    const order = await prisma.salesOrder.create({
      data: {
        companyId,
        customerId: input.customerId,
        number,
        expectedAt: input.expectedAt,
        notes: input.notes,
        status: "OPEN",
        createdBy: request.auth!.userId,
        items: { createMany: { data: input.items } }
      },
      include: { customer: true, items: { include: { product: true } } }
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "SalesOrder",
      entityId: order.id,
      newValues: order
    });

    response.status(201).json(order);
  })
);

salesRouter.post(
  "/orders/:id/approve",
  requirePermission("vendas:approve"),
  asyncHandler(async (request, response) => {
    const order = await prisma.salesOrder.update({
      where: { id: request.params.id },
      data: { status: "APPROVED" },
      include: { customer: true, items: { include: { product: true } } }
    });
    response.json(order);
  })
);

salesRouter.post(
  "/orders/:id/ship",
  requirePermission("vendas:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      warehouseId: z.string().uuid(),
      dueDate: z.coerce.date().optional(),
      notes: z.string().optional()
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const shipment = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id: request.params.id, companyId, deletedAt: null },
        include: { items: { include: { product: true } }, customer: true }
      });

      if (!order) {
        throw new AppError("SALES_ORDER_NOT_FOUND", "Pedido de venda nao encontrado.", 404);
      }

      if (order.status === "SHIPPED") {
        throw new AppError("SALES_ORDER_SHIPPED", "Pedido ja expedido.");
      }

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          type: "SAIDA",
          fromWarehouseId: input.warehouseId,
          reason: `Expedicao do pedido ${order.number}`,
          documentRef: order.number,
          createdBy: request.auth!.userId
        }
      });

      for (const item of order.items) {
        await applyShipmentBalance(tx, {
          movementId: movement.id,
          productId: item.productId,
          warehouseId: input.warehouseId,
          quantity: Number(item.quantity)
        });
      }

      const amount = order.items.reduce((total, item) => {
        return total + Number(item.quantity) * Number(item.unitPrice);
      }, 0);

      const receivable = await tx.accountReceivable.create({
        data: {
          companyId,
          customerId: order.customerId,
          customerName: order.customer?.name ?? "Cliente nao informado",
          amount,
          dueDate: input.dueDate ?? new Date(),
          history: `Pedido de venda ${order.number}`
        }
      });

      const createdShipment = await tx.salesShipment.create({
        data: {
          companyId,
          salesOrderId: order.id,
          warehouseId: input.warehouseId,
          stockMovementId: movement.id,
          receivableId: receivable.id,
          shippedBy: request.auth!.userId,
          notes: input.notes
        },
        include: {
          salesOrder: { include: { items: { include: { product: true } }, customer: true } },
          warehouse: true,
          stockMovement: true,
          receivable: true
        }
      });

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: "SHIPPED" }
      });

      return createdShipment;
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "ship",
      entity: "SalesOrder",
      entityId: request.params.id,
      newValues: shipment
    });

    response.status(201).json(shipment);
  })
);

type Tx = Prisma.TransactionClient;

async function applyShipmentBalance(
  tx: Tx,
  input: {
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
  const next = previous - input.quantity;

  if (next < 0) {
    throw new AppError("NEGATIVE_STOCK", "Saldo insuficiente para expedicao.");
  }

  await tx.stockBalance.update({
    where: { id: existing!.id },
    data: { quantity: next }
  });

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
