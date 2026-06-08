import { prisma } from "@antares/database";
import { Router } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../support/async-handler.js";
import { env } from "../../support/env.js";
import { AppError } from "../../support/errors.js";
import { verifyPassword } from "../../support/password.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().uuid().optional()
});

authRouter.post(
  "/login",
  asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        companies: {
          include: {
            company: true,
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AppError("INVALID_CREDENTIALS", "Email ou senha invalidos.", 401);
    }

    const companyLink =
      user.companies.find((item) => item.companyId === input.companyId) ?? user.companies[0];

    if (!companyLink) {
      throw new AppError("NO_COMPANY", "Usuario sem empresa vinculada.", 403);
    }

    const accessTokenOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const refreshTokenOptions: SignOptions = {
      expiresIn: `${env.REFRESH_TOKEN_EXPIRES_DAYS}d` as SignOptions["expiresIn"]
    };

    const accessToken = jwt.sign(
      { sub: user.id, companyId: companyLink.companyId },
      env.JWT_SECRET,
      accessTokenOptions
    );

    const refreshToken = jwt.sign({ sub: user.id, type: "refresh" }, env.JWT_SECRET, {
      ...refreshTokenOptions
    });

    await prisma.$transaction(async (tx) => {
      await tx.userSession.deleteMany({
        where: { userId: user.id }
      });
      await tx.userSession.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000)
        }
      });
    });

    response.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      company: {
        id: companyLink.company.id,
        name: companyLink.company.name
      },
      permissions: companyLink.role.permissions.map((item) => item.permission.code)
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
      select: { id: true, name: true, email: true, status: true }
    });

    response.json({
      user,
      companyId: request.auth!.companyId,
      permissions: request.auth!.permissions
    });
  })
);
