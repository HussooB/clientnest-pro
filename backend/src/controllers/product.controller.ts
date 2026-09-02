import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { productSchema } from "../validators/product.validator";

export async function listProducts(req: Request, res: Response): Promise<void> {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  res.status(200).json({
    success: true,
    data: products,
  });
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

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

export async function createProduct(req: Request, res: Response): Promise<void> {
  const input = productSchema.parse(req.body);

  const product = await prisma.product.create({
    data: input,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const input = productSchema.parse(req.body);

  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  const product = await prisma.product.update({
    where: { id },
    data: input,
  });

  res.status(200).json({
    success: true,
    data: product,
  });
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

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
