import type { PermissionCode } from "@antares/shared";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        companyId: string;
        roleId: string;
        permissions: PermissionCode[];
      };
    }
  }
}

export {};

