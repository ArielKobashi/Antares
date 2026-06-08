import { Prisma, prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";

export const warehouseRouter = Router();

warehouseRouter.use(requireAuth);

warehouseRouter.get(
  "/requisitions",
  requirePermission("almoxarifado:view"),
  asyncHandler(async (request, response) => {
    const requisitions = await prisma.warehouseRequisition.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    });
    response.json(requisitions);
  })
);

warehouseRouter.get(
  "/employees",
  requirePermission("almoxarifado:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.employee.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      orderBy: { name: "asc" }
    }));
  })
);

warehouseRouter.post(
  "/employees",
  requirePermission("almoxarifado:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      name: z.string().min(2),
      document: z.string().optional(),
      department: z.string().optional()
    }).parse(request.body);

    const employee = await prisma.employee.create({
      data: { ...input, companyId: request.auth!.companyId }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Employee",
      entityId: employee.id,
      newValues: employee
    });

    response.status(201).json(employee);
  })
);

warehouseRouter.get(
  "/ppe-deliveries",
  requirePermission("almoxarifado:view"),
  asyncHandler(async (request, response) => {
    const deliveries = await prisma.employeePpeDelivery.findMany({
      where: { employee: { companyId: request.auth!.companyId, deletedAt: null } },
      include: { employee: true },
      orderBy: { deliveredAt: "desc" },
      take: 100
    });
    const productIds = deliveries.map((delivery) => delivery.productId).filter((id): id is string => Boolean(id));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, companyId: request.auth!.companyId },
      select: { id: true, internalCode: true, description: true }
    });
    const productById = new Map(products.map((product) => [product.id, product]));
    response.json(deliveries.map((delivery) => ({
      ...delivery,
      product: delivery.productId ? productById.get(delivery.productId) ?? null : null
    })));
  })
);

warehouseRouter.post(
  "/ppe-deliveries",
  requirePermission("almoxarifado:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      employeeId: z.string().uuid(),
      productId: z.string().uuid(),
      warehouseId: z.string().uuid(),
      caNumber: z.string().min(1),
      size: z.string().optional(),
      quantity: z.coerce.number().positive(),
      replacementReason: z.string().optional()
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const delivery = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id: input.employeeId, companyId, deletedAt: null }
      });
      if (!employee) throw new AppError("EMPLOYEE_NOT_FOUND", "Funcionario nao encontrado.", 404);

      const product = await tx.product.findFirst({
        where: { id: input.productId, companyId, deletedAt: null }
      });
      if (!product) throw new AppError("PRODUCT_NOT_FOUND", "Produto nao encontrado.", 404);

      const warehouse = await tx.warehouse.findFirst({
        where: { id: input.warehouseId, companyId, deletedAt: null }
      });
      if (!warehouse) throw new AppError("WAREHOUSE_NOT_FOUND", "Estoque de origem nao encontrado.", 404);

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          type: "CONSUMO_INTERNO",
          fromWarehouseId: warehouse.id,
          reason: `Entrega de EPI para ${employee.name}`,
          documentRef: employee.id,
          createdBy: request.auth!.userId
        }
      });

      await applyBalanceChange(tx, {
        companyId,
        movementId: movement.id,
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: -input.quantity
      });

      return tx.employeePpeDelivery.create({
        data: {
          employeeId: employee.id,
          productId: product.id,
          deliveredAt: new Date(),
          caNumber: input.caNumber,
          size: input.size,
          quantity: input.quantity,
          replacementReason: input.replacementReason
        },
        include: { employee: true }
      });
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "deliver_ppe",
      entity: "EmployeePpeDelivery",
      entityId: delivery.id,
      newValues: delivery
    });

    response.status(201).json(delivery);
  })
);

warehouseRouter.get(
  "/tools",
  requirePermission("almoxarifado:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.toolAsset.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { loans: { include: { employee: true }, orderBy: { loanedAt: "desc" }, take: 3 } },
      orderBy: { name: "asc" }
    }));
  })
);

warehouseRouter.post(
  "/tools",
  requirePermission("almoxarifado:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      code: z.string().min(1),
      name: z.string().min(2),
      location: z.string().optional()
    }).parse(request.body);

    const tool = await prisma.toolAsset.create({
      data: { ...input, companyId: request.auth!.companyId }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "ToolAsset",
      entityId: tool.id,
      newValues: tool
    });

    response.status(201).json(tool);
  })
);

warehouseRouter.get(
  "/tool-loans",
  requirePermission("almoxarifado:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.toolLoan.findMany({
      where: { companyId: request.auth!.companyId },
      include: { tool: true, employee: true },
      orderBy: { loanedAt: "desc" },
      take: 100
    }));
  })
);

warehouseRouter.post(
  "/tools/:id/loan",
  requirePermission("almoxarifado:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      employeeId: z.string().uuid().optional(),
      borrower: z.string().min(2),
      reason: z.string().optional()
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const loan = await prisma.$transaction(async (tx) => {
      const tool = await tx.toolAsset.findFirst({
        where: { id: request.params.id, companyId, deletedAt: null }
      });
      if (!tool) throw new AppError("TOOL_NOT_FOUND", "Ferramenta nao encontrada.", 404);
      if (tool.status !== "AVAILABLE") throw new AppError("TOOL_UNAVAILABLE", "Ferramenta indisponivel para emprestimo.", 409);

      if (input.employeeId) {
        const employee = await tx.employee.findFirst({ where: { id: input.employeeId, companyId, deletedAt: null } });
        if (!employee) throw new AppError("EMPLOYEE_NOT_FOUND", "Funcionario nao encontrado.", 404);
      }

      const created = await tx.toolLoan.create({
        data: {
          companyId,
          toolId: tool.id,
          employeeId: input.employeeId,
          borrower: input.borrower,
          reason: input.reason,
          loanedBy: request.auth!.userId
        },
        include: { tool: true, employee: true }
      });

      await tx.toolAsset.update({ where: { id: tool.id }, data: { status: "LOANED" } });
      return created;
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "loan",
      entity: "ToolLoan",
      entityId: loan.id,
      newValues: loan
    });

    response.status(201).json(loan);
  })
);

warehouseRouter.post(
  "/tool-loans/:id/return",
  requirePermission("almoxarifado:update"),
  asyncHandler(async (request, response) => {
    const companyId = request.auth!.companyId;
    const loan = await prisma.$transaction(async (tx) => {
      const existing = await tx.toolLoan.findFirst({
        where: { id: request.params.id, companyId },
        include: { tool: true, employee: true }
      });
      if (!existing) throw new AppError("TOOL_LOAN_NOT_FOUND", "Emprestimo nao encontrado.", 404);
      if (existing.status !== "OPEN") throw new AppError("TOOL_LOAN_CLOSED", "Emprestimo ja devolvido.", 409);

      const returned = await tx.toolLoan.update({
        where: { id: existing.id },
        data: { status: "RETURNED", returnedBy: request.auth!.userId, returnedAt: new Date() },
        include: { tool: true, employee: true }
      });
      await tx.toolAsset.update({ where: { id: existing.toolId }, data: { status: "AVAILABLE" } });
      return returned;
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "return",
      entity: "ToolLoan",
      entityId: loan.id,
      newValues: loan
    });

    response.json(loan);
  })
);

warehouseRouter.post(
  "/requisitions",
  requirePermission("almoxarifado:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      requester: z.string().min(2),
      department: z.string().min(2),
      priority: z.string().default("Normal"),
      items: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().positive() })).min(1)
    }).parse(request.body);

    const requisition = await prisma.warehouseRequisition.create({
      data: {
        companyId: request.auth!.companyId,
        requester: input.requester,
        department: input.department,
        priority: input.priority,
        status: "PENDING_APPROVAL",
        items: { createMany: { data: input.items } }
      },
      include: { items: true }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "WarehouseRequisition",
      entityId: requisition.id,
      newValues: requisition
    });

    response.status(201).json(requisition);
  })
);

warehouseRouter.post(
  "/requisitions/:id/approve",
  requirePermission("almoxarifado:approve"),
  asyncHandler(async (request, response) => {
    const existing = await prisma.warehouseRequisition.findFirst({
      where: { id: request.params.id, companyId: request.auth!.companyId, deletedAt: null }
    });

    if (!existing) {
      throw new AppError("REQUISITION_NOT_FOUND", "Requisicao nao encontrada.", 404);
    }

    if (existing.status !== "PENDING_APPROVAL") {
      throw new AppError("INVALID_REQUISITION_STATUS", "A requisicao nao esta pendente de aprovacao.", 409);
    }

    const requisition = await prisma.warehouseRequisition.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedBy: request.auth!.userId,
        approvedAt: new Date()
      },
      include: { items: { include: { product: true } } }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "approve",
      entity: "WarehouseRequisition",
      entityId: requisition.id,
      oldValues: { status: existing.status },
      newValues: { status: requisition.status }
    });

    response.json(requisition);
  })
);

warehouseRouter.post(
  "/requisitions/:id/deliver",
  requirePermission("almoxarifado:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      warehouseId: z.string().uuid()
    }).parse(request.body);
    const companyId = request.auth!.companyId;

    const requisition = await prisma.$transaction(async (tx) => {
      const existing = await tx.warehouseRequisition.findFirst({
        where: { id: request.params.id, companyId, deletedAt: null },
        include: { items: { include: { product: true } } }
      });

      if (!existing) {
        throw new AppError("REQUISITION_NOT_FOUND", "Requisicao nao encontrada.", 404);
      }

      if (existing.status !== "APPROVED") {
        throw new AppError("INVALID_REQUISITION_STATUS", "A requisicao precisa estar aprovada para entrega.", 409);
      }

      const warehouse = await tx.warehouse.findFirst({
        where: { id: input.warehouseId, companyId, deletedAt: null }
      });

      if (!warehouse) {
        throw new AppError("WAREHOUSE_NOT_FOUND", "Estoque de origem nao encontrado.", 404);
      }

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          type: "CONSUMO_INTERNO",
          fromWarehouseId: warehouse.id,
          reason: `Entrega da requisicao ${existing.requester} - ${existing.department}`,
          documentRef: existing.id,
          createdBy: request.auth!.userId
        }
      });

      for (const item of existing.items) {
        await applyBalanceChange(tx, {
          companyId,
          movementId: movement.id,
          productId: item.productId,
          warehouseId: warehouse.id,
          quantity: -Number(item.quantity)
        });
      }

      return tx.warehouseRequisition.update({
        where: { id: existing.id },
        data: {
          status: "DELIVERED",
          deliveredBy: request.auth!.userId,
          deliveredAt: new Date()
        },
        include: { items: { include: { product: true } } }
      });
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "deliver",
      entity: "WarehouseRequisition",
      entityId: requisition.id,
      newValues: requisition
    });

    response.json(requisition);
  })
);

type Tx = Prisma.TransactionClient;

async function applyBalanceChange(
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

  if (next < 0) {
    throw new AppError("NEGATIVE_STOCK", "Saldo insuficiente para entrega da requisicao.");
  }

  if (existing) {
    await tx.stockBalance.update({
      where: { id: existing.id },
      data: { quantity: next }
    });
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
      quantity: Math.abs(input.quantity),
      previousBalance: previous,
      newBalance: next
    }
  });
}
