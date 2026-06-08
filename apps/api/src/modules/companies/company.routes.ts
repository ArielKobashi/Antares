import { prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";

export const companyRouter = Router();

companyRouter.use(requireAuth);

companyRouter.get(
  "/",
  requirePermission("administracao:view"),
  asyncHandler(async (_request, response) => {
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" }
    });
    response.json(companies);
  })
);

companyRouter.post(
  "/",
  requirePermission("administracao:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({ name: z.string().min(2), document: z.string().optional() }).parse(request.body);
    const company = await prisma.company.create({ data: input });
    await audit({
      companyId: company.id,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Company",
      entityId: company.id,
      newValues: company
    });
    response.status(201).json(company);
  })
);

