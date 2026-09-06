import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { productSchema } from "../validators/product.validator";

export async function listProducts(_req: Request, res: Response): Promise<void> {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  res.status(200).json({
    success: true,
    data: products,
  });
}

export async function getProduct(_req: Request, res: Response): Promise<void> {
  const { id } = _req.params as { id: string };

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json({
    success: true,
    data: product,
  });
}

export async function createProduct(_req: Request, res: Response): Promise<void> {
  const input = productSchema.parse(_req.body);

  const product = await prisma.product.create({
    data: {
      name: input.name,
      description: input.description as string | null,
      basePrice: input.basePrice,
    },
  });

  res.status(201).json({
    success: true,
    data: product,
  });
}

export async function updateProduct(_req: Request, res: Response): Promise<void> {
  const { id } = _req.params as { id: string };
  const input = productSchema.parse(_req.body);

  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description as string | null,
      basePrice: input.basePrice,
    },
  });

  res.status(200).json({
    success: true,
    data: product,
  });
}

export async function deleteProduct(_req: Request, res: Response): Promise<void> {
  const { id } = _req.params as { id: string };

  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  await prisma.product.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    data: { message: "Product deleted" },
  });
}