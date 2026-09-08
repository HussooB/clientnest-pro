import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { toSafeUser } from "../utils/user";
import { hashPassword } from "../utils/password"; 

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

// ✅ ADD THIS NEW CONTROLLER
export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, email, password, role, isActive } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(409).json({ success: false, message: "User with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      isActive: isActive ?? true,
    },
  });

  res.status(201).json({
    success: true,
    data: toSafeUser(newUser),
  });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { name, email, role, isActive, password } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const updateData: any = { name, email, role, isActive };
  
  if (password && password.trim().length > 0) {
    updateData.passwordHash = await hashPassword(password);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    success: true,
    data: toSafeUser(updatedUser),
  });
}