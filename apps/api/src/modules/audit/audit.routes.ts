import { prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { asyncHandler } from "../../support/async-handler.js";

export const auditRouter = Router();

auditRouter.use(requireAuth);

auditRouter.get(
  "/logs",
  requirePermission("administracao:view"),
  asyncHandler(async (request, response) => {
    const query = z.object({
      entity: z.string().optional(),
      operation: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50)
    }).parse(request.query);

    const logs = await prisma.auditLog.findMany({
      where: {
        companyId: request.auth!.companyId,
        entity: query.entity,
        operation: query.operation
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: query.limit
    });

    response.json(logs.map((log) => ({
      ...log,
      oldValues: parseJson(log.oldValues),
      newValues: parseJson(log.newValues)
    })));
  })
);

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
