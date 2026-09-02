import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { leadSchema, markLeadLostSchema } from "../validators/lead.validator";
import type { LeadStage, LostReason, LeadSource } from "@prisma/client";

export async function listLeads(req: Request, res: Response): Promise<void> {
  const { search, stage } = req.query;

  const where: {
    companyName?: { contains: string };
    stage?: LeadStage;
  } = {};

  if (search) {
    where.companyName = { contains: search as string };
  }

  if (stage) {
    where.stage = stage as LeadStage;
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: leads,
  });
}

export async function getLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  res.status(200).json({
    success: true,
    data: lead,
  });
}

export async function createLead(req: Request, res: Response): Promise<void> {
  const input = leadSchema.parse(req.body);

  const lead = await prisma.lead.create({
    data: {
      ...input,
      source: (input.source as LeadSource) || "Website",
      stage: (input.stage as LeadStage) || "New",
    },
  });

  res.status(201).json({
    success: true,
    data: lead,
  });
}

export async function updateLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const input = leadSchema.parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Lead not found");
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...input,
      stage: input.stage as LeadStage | undefined,
      source: input.source as LeadSource | undefined,
    },
  });

  res.status(200).json({
    success: true,
    data: lead,
  });
}

export async function convertLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (lead.convertedClientId) {
    throw new ApiError(409, "Lead already converted");
  }

  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        companyName: lead.companyName,
        status: "Active",
        accountOwnerId: req.user?.sub,
      },
    });

    if (lead.contactName || lead.email || lead.phone) {
      await tx.contact.create({
        data: {
          name: lead.contactName || lead.companyName,
          email: lead.email || null,
          phone: lead.phone || null,
          contactType: "Billing",
          notifyEmail: true,
          clientId: client.id,
        },
      });
    }

    await tx.lead.update({
      where: { id },
      data: {
        stage: "Won",
        convertedClientId: client.id,
      },
    });

    return client;
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}

export async function markLeadLost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { lostReason } = markLeadLostSchema.parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Lead not found");
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      stage: "Lost",
      lostReason: lostReason as LostReason,
    },
  });

  res.status(200).json({
    success: true,
    data: lead,
  });
}
