import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

type FieldError = {
  field: string;
  message: string;
};

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route ${_req.method} ${_req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal server error";
  let errors: FieldError[] | undefined = undefined;
  let stack: string | undefined = undefined;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";
    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    statusCode = 401;
    message = "Invalid or expired token";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      const meta = err.meta as { target?: unknown } | undefined;
      let targetName = "resource";
      if (meta && Array.isArray(meta.target)) {
        targetName = (meta.target as string[]).join(", ");
      }
      message = `Duplicate ${targetName}`;
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
    } else {
      statusCode = 400;
      message = "Database error";
    }
  } else if (err instanceof Error) {
    message = err.message;
    if (env.NODE_ENV === "development") {
      stack = err.stack;
    }
  }

  if (env.NODE_ENV === "development" && err instanceof Error && !stack) {
    stack = err.stack;
  }

  const body: {
    success: false;
    message: string;
    errors?: FieldError[];
    stack?: string;
  } = {
    success: false,
    message,
  };

  if (errors !== undefined) {
    body.errors = errors;
  }

  if (stack !== undefined && env.NODE_ENV === "development") {
    body.stack = stack;
  }

  res.status(statusCode).json(body);
}
