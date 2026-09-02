import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { env } from "../config/env";
import type { JwtPayload } from "../types";

export function signToken(payload: JwtPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as StringValue,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
