import type { ErpModule } from "./modules.js";

export const permissionActions = [
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "admin"
] as const;

export type PermissionAction = (typeof permissionActions)[number];

export type PermissionCode = `${ErpModule}:${PermissionAction}`;

export function permissionCode(module: ErpModule, action: PermissionAction): PermissionCode {
  return `${module}:${action}`;
}

export const defaultRoleNames = [
  "Administrador",
  "Gerente",
  "Compras",
  "Almoxarife",
  "Financeiro",
  "Operador",
  "Auditor"
] as const;

export type DefaultRoleName = (typeof defaultRoleNames)[number];
