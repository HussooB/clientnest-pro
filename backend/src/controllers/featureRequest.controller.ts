import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { logAudit, getAuditInput } from "../utils/audit";
import { z } from "zod";

const frSchema = z.object({
  clientId: z.string().min(1),
  productId: z.string().optional().or(z.literal("")),
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(["CustomDevelopment", "OutOfScope", "BugFix", "Enhancement"]),
  status: z.enum(["Requested", "Approved", "InProgress", "Delivered", "Rejected"]).optional(),
  estimatedCost: z.coerce.number().min(0).optional(),
  roadmapItem: z.string().optional(),
});

export async function listFeatureRequests(req: Request, res: Response): Promise<void> {
  const { clientId, status } = req.query as { clientId?: string; status?: string };
  const where: any = { deletedAt: null };
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;

  const requests = await prisma.featureRequest.findMany({
    where,
    include: { client: true, product: true },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ success: true, data: requests });
}

export async function createFeatureRequest(req: Request, res: Response): Promise<void> {
  const data = frSchema.parse(req.body);
  const user = req.user!;

  const fr = await prisma.featureRequest.create({
    data: {
      clientId: data.clientId,
      productId: data.productId || null,
      title: data.title,
      description: data.description,
      category: data.category,
      status: data.status || "Requested",
      estimatedCost: data.estimatedCost,
      roadmapItem: data.roadmapItem,
    },
    include: { client: true, product: true },
  });

  await logAudit(getAuditInput(user, "CREATE", "FeatureRequest", fr.id, null, fr));
  res.status(201).json({ success: true, data: fr });
}

export async function updateFeatureRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const data = frSchema.partial().parse(req.body);
  const user = req.user!;

  const existing = await prisma.featureRequest.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new ApiError(404, "Feature request not found");

  const fr = await prisma.featureRequest.update({
    where: { id },
    data: {
      ...data,
      productId: data.productId === "" ? null : data.productId,
    },
    include: { client: true, product: true },
  });

  await logAudit(getAuditInput(user, "UPDATE", "FeatureRequest", fr.id, existing, fr));
  res.status(200).json({ success: true, data: fr });
}

export async function deleteFeatureRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const user = req.user!;

  const existing = await prisma.featureRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Feature request not found");

  await prisma.featureRequest.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAudit(getAuditInput(user, "DELETE", "FeatureRequest", id, existing, { deletedAt: new Date() }));
  res.status(200).json({ success: true, data: { message: "Deleted" } });
}