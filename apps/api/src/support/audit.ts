import { prisma } from "@antares/database";

type AuditInput = {
  companyId?: string | null;
  userId?: string | null;
  ip?: string;
  operation: string;
  entity: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
};

export async function audit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      companyId: input.companyId ?? null,
      userId: input.userId ?? null,
      ip: input.ip,
      operation: input.operation,
      entity: input.entity,
      entityId: input.entityId ?? null,
      oldValues: input.oldValues === undefined ? undefined : JSON.stringify(input.oldValues),
      newValues: input.newValues === undefined ? undefined : JSON.stringify(input.newValues)
    }
  });
}
