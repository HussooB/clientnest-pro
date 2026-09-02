import { prisma } from "../lib/prisma";
import type { JwtPayload } from "../types";

interface AuditLogInput {
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      userEmail: input.userEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ? JSON.parse(JSON.stringify(input.before)) : null,
      after: input.after ? JSON.parse(JSON.stringify(input.after)) : null,
    },
  });
}

export function getAuditInput(
  user: JwtPayload | undefined,
  action: string,
  entityType: string,
  entityId: string,
  before?: unknown,
  after?: unknown
): AuditLogInput {
  return {
    userId: user?.sub ?? null,
    userEmail: user?.email ?? null,
    action,
    entityType,
    entityId,
    before,
    after,
  };
}
