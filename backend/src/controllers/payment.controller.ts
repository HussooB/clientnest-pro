import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { paymentCreateSchema } from "../validators/invoice.validator";
import { logAudit, getAuditInput } from "../utils/audit";

async function computeInvoiceBalance(invoiceId: string): Promise<{
  paidAmount: number;
  creditTotal: number;
  balance: number;
}> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
      creditNotes: true,
    },
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const creditTotal = invoice.creditNotes.reduce((sum, c) => sum + c.amount, 0);
  const balance = invoice.totalAmount - paidAmount - creditTotal;

  return { paidAmount, creditTotal, balance };
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const { invoiceId } = req.query;

  const where: { invoiceId?: string } = {};
  if (invoiceId && typeof invoiceId === "string") {
    where.invoiceId = invoiceId;
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      invoice: {
        include: { client: true },
      },
      createdBy: true,
    },
    orderBy: { paymentDate: "desc" },
  });

  res.status(200).json({
    success: true,
    data: payments,
  });
}

export async function createPayment(req: Request, res: Response): Promise<void> {
  const input = paymentCreateSchema.parse(req.body);
  const user = req.user!;

  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
  });

  if (!invoice || invoice.deletedAt) {
    throw new ApiError(404, "Invoice not found");
  }

  const { paidAmount, creditTotal, balance } = await computeInvoiceBalance(input.invoiceId);
  const remainingBalance = balance - input.amount;

  if (remainingBalance < 0) {
    throw new ApiError(400, "Payment amount exceeds outstanding balance");
  }

  let newStatus = invoice.status;
  if (remainingBalance === 0) {
    newStatus = "Paid";
  } else if (paidAmount + input.amount > 0) {
    newStatus = "PartiallyPaid";
  }

  const payment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        category: input.category,
        notes: input.notes,
        createdById: user.sub,
      },
      include: {
        invoice: true,
        createdBy: true,
      },
    });

    await tx.invoice.update({
      where: { id: input.invoiceId },
      data: { status: newStatus },
    });

    await logAudit(
      getAuditInput(user, "CREATE", "Payment", pay.id, null, pay)
    );

    return pay;
  });

  res.status(201).json({
    success: true,
    data: payment,
  });
}
