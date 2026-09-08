import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { logAudit, getAuditInput } from "../utils/audit";

export async function listContracts(req: Request, res: Response): Promise<void> {
  const { clientId, status } = req.query as { clientId?: string; status?: string };

  const where: any = { deletedAt: null };
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;

  const contracts = await prisma.contract.findMany({
    where,
    include: { client: true },
    orderBy: { endDate: "asc" },
  });

  // Calculate days to expiry
  const contractsWithDays = contracts.map((c) => {
    const daysToExpiry = c.endDate
      ? Math.ceil((c.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { ...c, daysToExpiry };
  });

  res.status(200).json({
    success: true,
    data: contractsWithDays,
  });
}

export async function getContract(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const contract = await prisma.contract.findUnique({
    where: { id, deletedAt: null },
    include: { client: true },
  });

  if (!contract) {
    throw new ApiError(404, "Contract not found");
  }

  const daysToExpiry = contract.endDate
    ? Math.ceil((contract.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  res.status(200).json({
    success: true,
    data: { ...contract, daysToExpiry },
  });
}

export async function createContract(req: Request, res: Response): Promise<void> {
  const { clientId, title, description, startDate, endDate, autoRenewal, renewalPeriod, value } = req.body;
  const user = req.user!;

  const contract = await prisma.$transaction(async (tx) => {
    const c = await tx.contract.create({
      data: {
        clientId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        autoRenewal,
        renewalPeriod,
        value,
        status: "Active",
      },
      include: { client: true },
    });

    await logAudit(getAuditInput(user, "CREATE", "Contract", c.id, null, c));
    return c;
  });

  res.status(201).json({
    success: true,
    data: contract,
  });
}

export async function updateContract(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { title, description, startDate, endDate, autoRenewal, renewalPeriod, value, status } = req.body;
  const user = req.user!;

  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new ApiError(404, "Contract not found");
  }

  const before = { ...existing };

  const contract = await prisma.$transaction(async (tx) => {
    const c = await tx.contract.update({
      where: { id },
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        autoRenewal,
        renewalPeriod,
        value,
        status,
      },
      include: { client: true },
    });

    await logAudit(getAuditInput(user, "UPDATE", "Contract", c.id, before, c));
    return c;
  });

  res.status(200).json({
    success: true,
    data: contract,
  });
}

export async function deleteContract(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const user = req.user!;

  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Contract not found");
  }

  const before = { ...existing };

  await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit(getAuditInput(user, "DELETE", "Contract", id, before, { deletedAt: new Date() }));
  });

  res.status(200).json({
    success: true,
    data: { message: "Contract soft-deleted" },
  });
}

export async function uploadContractFile(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const user = req.user!;

  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      fileUrl: `/uploads/contracts/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    },
    include: { client: true },
  });

  res.status(200).json({
    success: true,
    data: contract,
  });
}