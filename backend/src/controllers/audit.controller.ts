import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const { userId, entityType, from, to } = req.query;

  const where: {
    userId?: string;
    entityType?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (userId && typeof userId === "string") {
    where.userId = userId;
  }

  if (entityType && typeof entityType === "string") {
    where.entityType = entityType;
  }

  if (from || to) {
    where.createdAt = {};
    if (from && typeof from === "string") {
      where.createdAt.gte = new Date(from);
    }
    if (to && typeof to === "string") {
      where.createdAt.lte = new Date(to);
    }
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.status(200).json({
    success: true,
    data: auditLogs,
  });
}
