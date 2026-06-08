import { prisma } from "@antares/database";
import type { PermissionCode } from "@antares/shared";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../support/env.js";
import { AppError } from "../support/errors.js";

type TokenPayload = {
  sub: string;
  companyId: string;
};

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.header("authorization");
  const [, token] = header?.split(" ") ?? [];

  if (!token) {
    next(new AppError("UNAUTHORIZED", "Token ausente.", 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const link = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: payload.sub, companyId: payload.companyId } },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    if (!link) {
      next(new AppError("UNAUTHORIZED", "Usuario sem acesso a empresa.", 401));
      return;
    }

    request.auth = {
      userId: payload.sub,
      companyId: payload.companyId,
      roleId: link.roleId,
      permissions: link.role.permissions.map((item) => item.permission.code as PermissionCode)
    };

    next();
  } catch {
    next(new AppError("UNAUTHORIZED", "Token invalido.", 401));
  }
}

export function requirePermission(permission: PermissionCode) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth?.permissions.includes(permission)) {
      next(new AppError("FORBIDDEN", "Permissao insuficiente.", 403));
      return;
    }

    next();
  };
}

