import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { licenseSchema, licenseQuerySchema } from "../validators/license.validator";
import type { LicenseType } from "@prisma/client";

export async function listLicenses(req: Request, res: Response): Promise<void> {
  const query = licenseQuerySchema.parse(req.query);

  const where: {
    clientId?: string;
    endDate?: { lte: Date; gte: Date };
  } = {};

  if (query.clientId) {
    where.clientId = query.clientId;
  }

  if (query.expiringWithin) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + query.expiringWithin);
    where.endDate = {
      lte: future,
      gte: today,
    };
  }

  const licenses = await prisma.license.findMany({
    where,
    include: {
      client: true,
      product: true,
    },
    orderBy: { endDate: "asc" },
  });

  const result = licenses.map((lic) => {
    let daysToExpiry: number | null = null;
    if (lic.endDate && lic.type !== "Perpetual") {
      const now = new Date();
      const end = new Date(lic.endDate);
      const diff = end.getTime() - now.getTime();
      daysToExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      ...lic,
      daysToExpiry,
    };
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getLicense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      client: true,
      product: true,
    },
  });

  if (!license) {
    throw new ApiError(404, "License not found");
  }

  let daysToExpiry: number | null = null;
  if (license.endDate && license.type !== "Perpetual") {
    const now = new Date();
    const end = new Date(license.endDate);
    const diff = end.getTime() - now.getTime();
    daysToExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  res.status(200).json({
    success: true,
    data: {
      ...license,
      daysToExpiry,
    },
  });
}

export async function createLicense(req: Request, res: Response): Promise<void> {
  const input = licenseSchema.parse(req.body);

  const license = await prisma.license.create({
    data: {
      ...input,
      type: input.type as LicenseType,
      endDate: input.endDate || null,
    },
    include: {
      client: true,
      product: true,
    },
  });

  let daysToExpiry: number | null = null;
  if (license.endDate && license.type !== "Perpetual") {
    const now = new Date();
    const end = new Date(license.endDate);
    const diff = end.getTime() - now.getTime();
    daysToExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  res.status(201).json({
    success: true,
    data: {
      ...license,
      daysToExpiry,
    },
  });
}

export async function updateLicense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const input = licenseSchema.partial().parse(req.body);

  const existing = await prisma.license.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "License not found");
  }

  const license = await prisma.license.update({
    where: { id },
    data: {
      ...input,
      type: input.type as LicenseType | undefined,
      endDate: input.endDate || null,
    },
    include: {
      client: true,
      product: true,
    },
  });

  let daysToExpiry: number | null = null;
  if (license.endDate && license.type !== "Perpetual") {
    const now = new Date();
    const end = new Date(license.endDate);
    const diff = end.getTime() - now.getTime();
    daysToExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  res.status(200).json({
    success: true,
    data: {
      ...license,
      daysToExpiry,
    },
  });
}

export async function deleteLicense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.license.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "License not found");
  }

  await prisma.license.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    data: { message: "License deleted" },
  });
}
