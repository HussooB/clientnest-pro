import type { Role, User } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  name: string;
  email: string;
  role: Role;
};

export type SafeUser = Omit<User, "passwordHash">;

export type LoginRequest = {
  email: string;
  password: string;
};
