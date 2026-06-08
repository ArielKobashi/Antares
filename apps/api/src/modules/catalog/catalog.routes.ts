import { prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get(
  "/products",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    const products = await prisma.product.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { category: true, brand: true, unit: true, stockBalances: true },
      orderBy: { description: "asc" }
    });
    response.json(products);
  })
);

catalogRouter.post(
  "/products",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      internalCode: z.string().min(1),
      barcode: z.string().optional(),
      description: z.string().min(2),
      categoryId: z.string().uuid().optional(),
      brandId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
      averageCost: z.coerce.number().default(0),
      salePrice: z.coerce.number().default(0),
      minimumStock: z.coerce.number().default(0),
      maximumStock: z.coerce.number().optional(),
      weight: z.coerce.number().optional(),
      dimensions: z.string().optional(),
      imageUrl: z.string().optional(),
      active: z.boolean().optional(),
      notes: z.string().optional()
    }).parse(request.body);

    const product = await prisma.product.create({
      data: { ...input, companyId: request.auth!.companyId }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Product",
      entityId: product.id,
      newValues: product
    });

    response.status(201).json(product);
  })
);

catalogRouter.get(
  "/categories",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.category.findMany({ where: { companyId: request.auth!.companyId, deletedAt: null } }));
  })
);

catalogRouter.post(
  "/categories",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({ name: z.string().min(2), parentId: z.string().uuid().optional() }).parse(request.body);
    const category = await prisma.category.create({
      data: { ...input, companyId: request.auth!.companyId }
    });
    response.status(201).json(category);
  })
);

catalogRouter.get(
  "/brands",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.brand.findMany({ where: { companyId: request.auth!.companyId, deletedAt: null }, orderBy: { name: "asc" } }));
  })
);

catalogRouter.post(
  "/brands",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({ name: z.string().min(2) }).parse(request.body);
    const brand = await prisma.brand.create({ data: { ...input, companyId: request.auth!.companyId } });
    response.status(201).json(brand);
  })
);

catalogRouter.get(
  "/units",
  requirePermission("estoque:view"),
  asyncHandler(async (request, response) => {
    response.json(await prisma.unit.findMany({ where: { companyId: request.auth!.companyId, deletedAt: null } }));
  })
);

catalogRouter.post(
  "/units",
  requirePermission("estoque:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({ code: z.string().min(1), name: z.string().min(2) }).parse(request.body);
    const unit = await prisma.unit.create({ data: { ...input, companyId: request.auth!.companyId } });
    response.status(201).json(unit);
  })
);

catalogRouter.get(
  "/suppliers",
  requirePermission("compras:view"),
  asyncHandler(async (request, response) => {
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      orderBy: { legalName: "asc" }
    });
    response.json(suppliers);
  })
);

catalogRouter.post(
  "/suppliers",
  requirePermission("compras:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      document: z.string().optional(),
      legalName: z.string().min(2),
      contacts: z.string().optional(),
      address: z.string().optional(),
      rating: z.coerce.number().int().min(1).max(5).optional()
    }).parse(request.body);

    const supplier = await prisma.supplier.create({
      data: { ...input, companyId: request.auth!.companyId }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Supplier",
      entityId: supplier.id,
      newValues: supplier
    });

    response.status(201).json(supplier);
  })
);

catalogRouter.get(
  "/customers",
  requirePermission("vendas:view"),
  asyncHandler(async (request, response) => {
    const customers = await prisma.customer.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      orderBy: { name: "asc" }
    });
    response.json(customers);
  })
);

catalogRouter.post(
  "/customers",
  requirePermission("vendas:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      document: z.string().optional(),
      name: z.string().min(2),
      contacts: z.string().optional(),
      address: z.string().optional(),
      creditLimit: z.coerce.number().optional()
    }).parse(request.body);

    const customer = await prisma.customer.create({
      data: { ...input, companyId: request.auth!.companyId }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Customer",
      entityId: customer.id,
      newValues: customer
    });

    response.status(201).json(customer);
  })
);
