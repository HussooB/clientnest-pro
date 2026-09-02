import type { User } from "@prisma/client";
import type { SafeUser } from "../types";

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
