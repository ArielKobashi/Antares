import { prisma } from "@antares/database";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { audit } from "../../support/audit.js";
import { asyncHandler } from "../../support/async-handler.js";
import { AppError } from "../../support/errors.js";
import { hashPassword } from "../../support/password.js";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get(
  "/",
  requirePermission("administracao:view"),
  asyncHandler(async (request, response) => {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        companies: { some: { companyId: request.auth!.companyId } }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        companies: {
          where: { companyId: request.auth!.companyId },
          select: { role: { select: { id: true, name: true } } }
        }
      }
    });
    response.json(users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      role: user.companies[0]?.role ?? null
    })));
  })
);

userRouter.get(
  "/roles",
  requirePermission("administracao:view"),
  asyncHandler(async (request, response) => {
    const roles = await prisma.role.findMany({
      where: { companyId: request.auth!.companyId, deletedAt: null },
      include: { permissions: { include: { permission: true }, orderBy: { permission: { code: "asc" } } } },
      orderBy: { name: "asc" }
    });
    response.json(roles.map((role) => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions.map((item) => item.permission)
    })));
  })
);

userRouter.get(
  "/permissions",
  requirePermission("administracao:view"),
  asyncHandler(async (_request, response) => {
    response.json(await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] }));
  })
);

userRouter.post(
  "/roles",
  requirePermission("administracao:admin"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      name: z.string().min(2),
      permissionCodes: z.array(z.string().min(3)).min(1)
    }).parse(request.body);

    const permissions = await prisma.permission.findMany({
      where: { code: { in: input.permissionCodes } }
    });

    if (permissions.length !== new Set(input.permissionCodes).size) {
      throw new AppError("INVALID_PERMISSIONS", "Uma ou mais permissoes sao invalidas.");
    }

    const role = await prisma.role.create({
      data: {
        companyId: request.auth!.companyId,
        name: input.name,
        permissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id }))
        }
      },
      include: { permissions: { include: { permission: true } } }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "Role",
      entityId: role.id,
      newValues: { id: role.id, name: role.name, permissionCodes: permissions.map((permission) => permission.code) }
    });

    response.status(201).json({
      id: role.id,
      name: role.name,
      permissions: role.permissions.map((item) => item.permission)
    });
  })
);

userRouter.post(
  "/",
  requirePermission("administracao:create"),
  asyncHandler(async (request, response) => {
    const input = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      roleId: z.string().uuid()
    }).parse(request.body);

    const role = await prisma.role.findFirst({
      where: { id: input.roleId, companyId: request.auth!.companyId, deletedAt: null }
    });

    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Papel nao encontrado para esta empresa.", 404);
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: hashPassword(input.password),
        companies: {
          create: {
            companyId: request.auth!.companyId,
            roleId: input.roleId
          }
        }
      },
      select: { id: true, name: true, email: true, status: true, createdAt: true }
    });

    await audit({
      companyId: request.auth!.companyId,
      userId: request.auth!.userId,
      ip: request.ip,
      operation: "create",
      entity: "User",
      entityId: user.id,
      newValues: user
    });

    response.status(201).json(user);
  })
);
