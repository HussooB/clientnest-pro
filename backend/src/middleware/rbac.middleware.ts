import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

export function requireRole(...allowedRoles: Role[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    const user = _req.user;
    if (!user) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      next(new ApiError(403, "Insufficient permissions"));
      return;
    }
    next();
  };
}
