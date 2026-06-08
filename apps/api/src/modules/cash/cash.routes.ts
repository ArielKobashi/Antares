import { Prisma, prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";

export const cashRouter = Router();

cashRouter.use(requireAuth);

cashRouter.get(
  "/registers",
  requirePermission("caixa:view"),
  asyncHandler(async (request, response) => {
    const registers = await prisma.cashRegister.findMany({
      where: { companyId: request.auth!.companyId, active: true },
      include: { sessions: { include: { operations: true }, orderBy: { openedAt: "desc" }, take: 3 } },
      orderBy: { name: "asc" }
    });
    response.json(registers);
  })
);

cashRouter.post(
  "/registers",
  requirePermission("caixa:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({ name: z.string().min(2) }).parse(request.body);
    const register = await prisma.cashRegister.create({
      data: { companyId: request.auth!.companyId, name: input.name }
    });
    response.status(201).json(register);
  })
);

cashRouter.get(
  "/sessions",
  requirePermission("caixa:view"),
  asyncHandler(async (request, response) => {
    const sessions = await prisma.cashSession.findMany({
      where: { register: { companyId: request.auth!.companyId } },
      include: { register: true, operations: { include: { receivable: true } } },
      orderBy: { openedAt: "desc" },
      take: 50
    });
    response.json(sessions);
  })
);

cashRouter.post(
  "/sessions",
  requirePermission("caixa:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      registerId: z.string().uuid(),
      openingAmount: z.coerce.number().min(0).default(0)
    }).parse(request.body);

    const openSession = await prisma.cashSession.findFirst({
      where: { registerId: input.registerId, status: "OPEN" }
    });

    if (openSession) {
      throw new AppError("CASH_SESSION_OPEN", "Ja existe caixa aberto para este terminal.");
    }

    const session = await prisma.cashSession.create({
      data: {
        registerId: input.registerId,
        openedBy: request.auth!.userId,
        expectedAmount: input.openingAmount,
        operations: input.openingAmount > 0 ? {
          create: {
            type: "SUPRIMENTO",
            method: "DINHEIRO",
            amount: input.openingAmount,
            description: "Valor inicial",
            createdBy: request.auth!.userId
          }
        } : undefined
      },
      include: { register: true, operations: true }
    });

    response.status(201).json(session);
  })
);

cashRouter.post(
  "/sessions/:id/receive",
  requirePermission("caixa:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      receivableId: z.string().uuid(),
      method: z.enum(["DINHEIRO", "PIX", "CARTAO", "TRANSFERENCIA", "BOLETO"]),
      amount: z.coerce.number().positive()
    }).parse(request.body);

    const companyId = request.auth!.companyId;
    const operation = await prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { id: request.params.id, status: "OPEN", register: { companyId } }
      });

      if (!session) {
        throw new AppError("CASH_SESSION_NOT_FOUND", "Caixa aberto nao encontrado.", 404);
      }

      const receivable = await tx.accountReceivable.findFirst({
        where: { id: input.receivableId, companyId, deletedAt: null }
      });

      if (!receivable) {
        throw new AppError("RECEIVABLE_NOT_FOUND", "Conta a receber nao encontrada.", 404);
      }

      if (receivable.status === "PAID") {
        throw new AppError("RECEIVABLE_PAID", "Conta ja recebida.");
      }

      const created = await tx.cashOperation.create({
        data: {
          sessionId: session.id,
          receivableId: receivable.id,
          type: "RECEBIMENTO",
          method: input.method,
          amount: input.amount,
          description: receivable.history,
          createdBy: request.auth!.userId
        },
        include: { receivable: true }
      });

      const expectedAmount = Number(session.expectedAmount) + input.amount;
      await tx.cashSession.update({
        where: { id: session.id },
        data: { expectedAmount }
      });

      await tx.accountReceivable.update({
        where: { id: receivable.id },
        data: { status: "PAID" }
      });

      return created;
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "receive",
      entity: "CashOperation",
      entityId: operation.id,
      newValues: operation
    });

    response.status(201).json(operation);
  })
);

cashRouter.post(
  "/sessions/:id/pos-sale",
  requirePermission("caixa:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      warehouseId: z.string().uuid(),
      method: z.enum(["DINHEIRO", "PIX", "CARTAO", "TRANSFERENCIA", "BOLETO"]),
      customerName: z.string().optional(),
      items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0)
      })).min(1)
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { id: request.params.id, status: "OPEN", register: { companyId } }
      });
      if (!session) throw new AppError("CASH_SESSION_NOT_FOUND", "Caixa aberto nao encontrado.", 404);

      const warehouse = await tx.warehouse.findFirst({
        where: { id: input.warehouseId, companyId, deletedAt: null }
      });
      if (!warehouse) throw new AppError("WAREHOUSE_NOT_FOUND", "Estoque do PDV nao encontrado.", 404);

      const amount = roundMoney(input.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0));
      const operation = await tx.cashOperation.create({
        data: {
          sessionId: session.id,
          type: "PDV",
          method: input.method,
          amount,
          description: input.customerName ? `Venda PDV - ${input.customerName}` : "Venda PDV",
          createdBy: request.auth!.userId
        }
      });

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          type: "SAIDA",
          fromWarehouseId: warehouse.id,
          reason: `Venda PDV ${operation.id}`,
          documentRef: operation.id,
          createdBy: request.auth!.userId
        }
      });

      for (const item of input.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId, deletedAt: null }
        });
        if (!product) throw new AppError("PRODUCT_NOT_FOUND", "Produto nao encontrado.", 404);
        await applyCashBalanceChange(tx, {
          movementId: movement.id,
          productId: item.productId,
          warehouseId: warehouse.id,
          quantity: item.quantity
        });
      }

      const expectedAmount = roundMoney(Number(session.expectedAmount) + amount);
      await tx.cashSession.update({
        where: { id: session.id },
        data: { expectedAmount }
      });

      return { operation, movement, amount };
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "pos_sale",
      entity: "CashOperation",
      entityId: result.operation.id,
      newValues: result
    });

    response.status(201).json(result);
  })
);

cashRouter.post(
  "/sessions/:id/close",
  requirePermission("caixa:approve"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      informedAmount: z.coerce.number().min(0)
    }).parse(request.body);

    const existing = await prisma.cashSession.findFirst({
      where: { id: request.params.id, status: "OPEN", register: { companyId: request.auth!.companyId } }
    });

    if (!existing) {
      throw new AppError("CASH_SESSION_NOT_FOUND", "Caixa aberto nao encontrado.", 404);
    }

    const expectedAmount = Number(existing.expectedAmount);
    const session = await prisma.cashSession.update({
      where: { id: existing.id },
      data: {
        status: "CLOSED",
        closedBy: request.auth!.userId,
        closedAt: new Date(),
        informedAmount: input.informedAmount,
        difference: input.informedAmount - expectedAmount
      },
      include: { register: true, operations: true }
    });

    response.json(session);
  })
);

type Tx = Prisma.TransactionClient;

async function applyCashBalanceChange(
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
    throw new AppError("NEGATIVE_STOCK", "Saldo insuficiente para venda PDV.");
  }

  if (!existing) {
    throw new AppError("NEGATIVE_STOCK", "Produto sem saldo no estoque do PDV.");
  }

  await tx.stockBalance.update({
    where: { id: existing.id },
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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
