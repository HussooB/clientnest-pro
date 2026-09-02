import type { Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { signToken } from "../utils/jwt";
import { comparePassword } from "../utils/password";
import { toSafeUser } from "../utils/user";
import { loginSchema } from "../validators/auth.validator";
import type { SafeUser } from "../types";

type LoginResponseUser = Pick<SafeUser, "id" | "name" | "email" | "role">;

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const passwordValid = await comparePassword(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  });

  const safeUser: LoginResponseUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };

  res.status(200).json({
    success: true,
    data: {
      token,
      user: safeUser,
    },
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  res.status(200).json({
    success: true,
    data: {
      user: toSafeUser(user),
    },
  });
}
