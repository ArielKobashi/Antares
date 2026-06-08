import { prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError, notFound } from "../../support/errors.js";

export const financeRouter = Router();

financeRouter.use(requireAuth);

financeRouter.get(
  "/accounts-payable",
  requirePermission("financeiro:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.accountPayable.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      orderBy: { dueDate: "asc" }
    }));
  })
);

financeRouter.post(
  "/accounts-payable",
  requirePermission("financeiro:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      supplierName: z.string().min(2),
      category: z.string().min(2),
      amount: z.coerce.number().positive(),
      dueDate: z.coerce.date(),
      installment: z.string().optional()
    }).parse(request.body);
    const payable = await prisma.accountPayable.create({
      data: { ...input, companyId: request.auth!.companyId }
    });
    response.status(201).json(payable);
  })
);

financeRouter.post(
  "/accounts-payable/:id/pay",
  requirePermission("financeiro:update"),
  asyncHandler(async (request, response) => {
    const payable = await prisma.accountPayable.findFirst({
      where: { id: request.params.id, companyId: request.auth!.companyId, deletedAt: null }
    });

    if (!payable) throw notFound("Conta a pagar nao encontrada.");
    if (payable.status !== "OPEN") {
      throw new AppError("INVALID_STATUS", "Esta conta a pagar ja foi baixada.", 409);
    }

    const updated = await prisma.accountPayable.update({
      where: { id: payable.id },
      data: { status: "PAID" }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "PAY_ACCOUNT_PAYABLE",
      entity: "AccountPayable",
      entityId: payable.id,
      oldValues: { status: payable.status },
      newValues: { status: updated.status }
    });

    response.json(updated);
  })
);

financeRouter.get(
  "/accounts-receivable",
  requirePermission("financeiro:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.accountReceivable.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      orderBy: { dueDate: "asc" }
    }));
  })
);

financeRouter.post(
  "/accounts-receivable",
  requirePermission("financeiro:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      customerName: z.string().min(2),
      customerId: z.string().uuid().optional(),
      amount: z.coerce.number().positive(),
      dueDate: z.coerce.date(),
      history: z.string().optional()
    }).parse(request.body);
    const receivable = await prisma.accountReceivable.create({
      data: { ...input, companyId: request.auth!.companyId }
    });
    response.status(201).json(receivable);
  })
);
