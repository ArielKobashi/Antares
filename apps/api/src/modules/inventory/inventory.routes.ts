import { Prisma, prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get(
  "/warehouses",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    const warehouses = await prisma.warehouse.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { locations: true },
      orderBy: { name: "asc" }
    });
    response.json(warehouses);
  })
);

inventoryRouter.post(
  "/warehouses",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({ name: z.string().min(2), code: z.string().min(1) }).parse(request.body);
    const warehouse = await prisma.warehouse.create({
      data: { ...input, companyId: request.auth!.companyId }
    });
    response.status(201).json(warehouse);
  })
);

inventoryRouter.post(
  "/locations",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      warehouseId: z.string().uuid(),
      sector: z.string().min(1),
      aisle: z.string().min(1),
      shelf: z.string().min(1),
      position: z.string().min(1)
    }).parse(request.body);

    const code = `${input.sector}/${input.aisle}/${input.shelf}/${input.position}`;
    const location = await prisma.stockLocation.create({
      data: { ...input, code, companyId: request.auth!.companyId }
    });

    response.status(201).json(location);
  })
);

inventoryRouter.get(
  "/balances",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    const balances = await prisma.stockBalance.findMany({
      where: { companyId: request.auth!.companyId },
      include: { product: true, warehouse: true, location: true, batch: true },
      orderBy: { updatedAt: "desc" }
    });
    response.json(balances);
  })
);

inventoryRouter.get(
  "/batches",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    const batches = await prisma.batch.findMany({
      where: { product: { companyId: request.auth!.companyId }, deletedAt: null },
      include: { product: true, balances: { include: { warehouse: true } } },
      orderBy: [{ expiresAt: "asc" }, { number: "asc" }]
    });
    response.json(batches);
  })
);

inventoryRouter.post(
  "/batches",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      productId: z.string().uuid(),
      number: z.string().min(1),
      manufacturedAt: z.coerce.date().optional(),
      expiresAt: z.coerce.date().optional()
    }).parse(request.body);

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId: request.auth!.companyId, deletedAt: null }
    });

    if (!product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Produto nao encontrado.", 404);
    }

    const batch = await prisma.batch.create({ data: input, include: { product: true } });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Batch",
      entityId: batch.id,
      newValues: batch
    });

    response.status(201).json(batch);
  })
);

inventoryRouter.get(
  "/expiration-alerts",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    const days = Number(request.query.days ?? 90);
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const [expired, expiring] = await Promise.all([
      prisma.batch.findMany({
        where: {
          product: { companyId: request.auth!.companyId },
          deletedAt: null,
          expiresAt: { lt: now }
        },
        include: { product: true, balances: { include: { warehouse: true } } },
        orderBy: { expiresAt: "asc" }
      }),
      prisma.batch.findMany({
        where: {
          product: { companyId: request.auth!.companyId },
          deletedAt: null,
          expiresAt: { gte: now, lte: limit }
        },
        include: { product: true, balances: { include: { warehouse: true } } },
        orderBy: { expiresAt: "asc" }
      })
    ]);

    response.json({ days, expired, expiring });
  })
);

const movementSchema = z.object({
  type: z.enum(["ENTRADA", "SAIDA", "TRANSFERENCIA", "AJUSTE", "PRODUCAO", "CONSUMO_INTERNO", "PERDA", "AVARIA"]),
  fromWarehouseId: z.string().uuid().optional(),
  toWarehouseId: z.string().uuid().optional(),
  reason: z.string().min(3),
  documentRef: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      batchId: z.string().uuid().optional(),
      locationId: z.string().uuid().optional(),
      quantity: z.coerce.number().positive()
    })
  ).min(1)
});

inventoryRouter.post(
  "/movements",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = movementSchema.parse(request.body);
    const companyId = request.auth!.companyId;

    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.stockMovement.create({
        data: {
          companyId,
          type: input.type,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          reason: input.reason,
          documentRef: input.documentRef,
          createdBy: request.auth!.userId
        }
      });

      for (const item of input.items) {
        if (input.type === "TRANSFERENCIA") {
          if (!input.fromWarehouseId || !input.toWarehouseId) {
            throw new AppError("INVALID_MOVEMENT", "Transferencia exige estoque origem e destino.");
          }
          await applyBalanceChange(tx, {
            companyId,
            movementId: created.id,
            productId: item.productId,
            warehouseId: input.fromWarehouseId,
            locationId: item.locationId,
            batchId: item.batchId,
            quantity: -item.quantity
          });
          await applyBalanceChange(tx, {
            companyId,
            movementId: created.id,
            productId: item.productId,
            warehouseId: input.toWarehouseId,
            locationId: item.locationId,
            batchId: item.batchId,
            quantity: item.quantity
          });
          continue;
        }

        const warehouseId = input.type === "SAIDA" || input.type === "CONSUMO_INTERNO" || input.type === "PERDA" || input.type === "AVARIA"
          ? input.fromWarehouseId
          : input.toWarehouseId;

        if (!warehouseId) {
          throw new AppError("INVALID_MOVEMENT", "Movimentacao exige estoque.");
        }

        const sign = input.type === "SAIDA" || input.type === "CONSUMO_INTERNO" || input.type === "PERDA" || input.type === "AVARIA" ? -1 : 1;
        await applyBalanceChange(tx, {
          companyId,
          movementId: created.id,
          productId: item.productId,
          warehouseId,
          locationId: item.locationId,
          batchId: item.batchId,
          quantity: item.quantity * sign
        });
      }

      return tx.stockMovement.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: { include: { product: true, batch: true } } }
      });
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "StockMovement",
      entityId: movement.id,
      newValues: movement
    });

    response.status(201).json(movement);
  })
);

inventoryRouter.get(
  "/movements",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    const movements = await prisma.stockMovement.findMany({
      where: { companyId: request.auth!.companyId },
      include: { items: { include: { product: true, batch: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    response.json(movements);
  })
);

inventoryRouter.get(
  "/inventories",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    const inventories = await prisma.inventory.findMany({
      where: { companyId: request.auth!.companyId },
      include: { warehouse: true, counts: { include: { product: true } } },
      orderBy: { startedAt: "desc" }
    });
    response.json(inventories);
  })
);

inventoryRouter.post(
  "/inventories",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      warehouseId: z.string().uuid(),
      name: z.string().min(2),
      notes: z.string().optional()
    }).parse(request.body);

    const inventory = await prisma.inventory.create({
      data: {
        companyId: request.auth!.companyId,
        warehouseId: input.warehouseId,
        name: input.name,
        notes: input.notes,
        startedBy: request.auth!.userId
      },
      include: { warehouse: true, counts: true }
    });

    response.status(201).json(inventory);
  })
);

inventoryRouter.post(
  "/inventories/:id/counts",
  requirePermission("estoque:update"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      productId: z.string().uuid(),
      countedQuantity: z.coerce.number().min(0)
    }).parse(request.body);

    const inventory = await prisma.inventory.findFirst({
      where: { id: request.params.id, companyId: request.auth!.companyId }
    });

    if (!inventory) {
      throw new AppError("INVENTORY_NOT_FOUND", "Inventario nao encontrado.", 404);
    }

    if (inventory.status !== "OPEN") {
      throw new AppError("INVENTORY_CLOSED", "Inventario ja fechado.");
    }

    const balance = await prisma.stockBalance.findFirst({
      where: {
        companyId: request.auth!.companyId,
        warehouseId: inventory.warehouseId,
        productId: input.productId
      }
    });
    const expectedQuantity = Number(balance?.quantity ?? 0);
    const difference = input.countedQuantity - expectedQuantity;

    const count = await prisma.inventoryCount.upsert({
      where: {
        inventoryId_productId: {
          inventoryId: inventory.id,
          productId: input.productId
        }
      },
      update: {
        expectedQuantity,
        countedQuantity: input.countedQuantity,
        difference,
        countedBy: request.auth!.userId,
        countedAt: new Date()
      },
      create: {
        inventoryId: inventory.id,
        productId: input.productId,
        expectedQuantity,
        countedQuantity: input.countedQuantity,
        difference,
        countedBy: request.auth!.userId
      },
      include: { product: true }
    });

    response.status(201).json(count);
  })
);

inventoryRouter.post(
  "/inventories/:id/close",
  requirePermission("estoque:approve"),
  asyncHandler(async (request, response) => {
    const companyId = request.auth!.companyId;
    const inventory = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findFirst({
        where: { id: request.params.id, companyId },
        include: { counts: { include: { product: true } } }
      });

      if (!existing) {
        throw new AppError("INVENTORY_NOT_FOUND", "Inventario nao encontrado.", 404);
      }

      if (existing.status !== "OPEN") {
        throw new AppError("INVENTORY_CLOSED", "Inventario ja fechado.", 409);
      }

      const divergentCounts = existing.counts.filter((count) => Number(count.difference) !== 0);

      for (const count of divergentCounts) {
        const difference = Number(count.difference);
        const movement = await tx.stockMovement.create({
          data: {
            companyId,
            type: "AJUSTE",
            fromWarehouseId: difference < 0 ? existing.warehouseId : undefined,
            toWarehouseId: difference > 0 ? existing.warehouseId : undefined,
            reason: `Ajuste do inventario ${existing.name}`,
            documentRef: existing.id,
            createdBy: request.auth!.userId
          }
        });

        await applyBalanceChange(tx, {
          companyId,
          movementId: movement.id,
          productId: count.productId,
          warehouseId: existing.warehouseId,
          quantity: difference
        });
      }

      return tx.inventory.update({
        where: { id: existing.id },
        data: {
          status: "CLOSED",
          closedBy: request.auth!.userId,
          closedAt: new Date()
        },
        include: { warehouse: true, counts: { include: { product: true } } }
      });
    });

    await audit({
      companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "close",
      entity: "Inventory",
      entityId: inventory.id,
      newValues: inventory
    });

    response.json(inventory);
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
    locationId?: string;
    batchId?: string;
    quantity: number;
  }
) {
  const existing = await tx.stockBalance.findFirst({
    where: {
      productId: input.productId,
      warehouseId: input.warehouseId,
      locationId: input.locationId ?? null,
      batchId: input.batchId ?? null
    }
  });

  const previous = Number(existing?.quantity ?? 0);
  const next = previous + input.quantity;

  if (next < 0) {
    throw new AppError("NEGATIVE_STOCK", "Saldo insuficiente para movimentacao.");
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
        locationId: input.locationId,
        batchId: input.batchId,
        quantity: next
      }
    });
  }

  await tx.stockMovementItem.create({
    data: {
      movementId: input.movementId,
      productId: input.productId,
      batchId: input.batchId,
      quantity: Math.abs(input.quantity),
      previousBalance: previous,
      newBalance: next
    }
  });
}
