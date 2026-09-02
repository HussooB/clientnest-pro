import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { toSafeUser } from "../utils/user";

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  const safeUsers = users.map((u) => {
    const safe = toSafeUser(u);
    return {
      id: safe.id,
      name: safe.name,
      email: safe.email,
      role: safe.role,
      isActive: safe.isActive,
      createdAt: safe.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    data: safeUsers,
  });
}
