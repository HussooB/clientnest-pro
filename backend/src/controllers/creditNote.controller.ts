import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { creditNoteCreateSchema } from "../validators/invoice.validator";
import { logAudit, getAuditInput } from "../utils/audit";

export async function listCreditNotes(req: Request, res: Response): Promise<void> {
  const { invoiceId } = req.query;

  const where: { invoiceId?: string } = {};
  if (invoiceId && typeof invoiceId === "string") {
    where.invoiceId = invoiceId;
  }

  const creditNotes = await prisma.creditNote.findMany({
    where,
    include: {
      invoice: {
        include: { client: true },
      },
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: creditNotes,
  });
}

export async function createCreditNote(req: Request, res: Response): Promise<void> {
  const input = creditNoteCreateSchema.parse(req.body);
  const user = req.user!;

  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
  });

  if (!invoice || invoice.deletedAt) {
    throw new ApiError(404, "Invoice not found");
  }

  const creditNote = await prisma.$transaction(async (tx) => {
    const cn = await tx.creditNote.create({
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        reason: input.reason,
        createdById: user.sub,
      },
      include: {
        invoice: true,
        createdBy: true,
      },
    });

    await logAudit(
      getAuditInput(user, "CREATE", "CreditNote", cn.id, null, cn)
    );

    return cn;
  });

  res.status(201).json({
    success: true,
    data: creditNote,
  });
}
