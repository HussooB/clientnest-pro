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

  const paidAmount = invoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  const creditTotal = invoice.creditNotes.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0);
  const balance = invoice.totalAmount - paidAmount - creditTotal;

  return { paidAmount, creditTotal, balance };
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const { clientId, category, from, to } = req.query as { 
    clientId?: string; 
    category?: string;
    from?: string;
    to?: string;
  };

  const where: any = {};
  
  if (category) {
    where.category = category;
  }
  
  if (from || to) {
    where.paymentDate = {};
    if (from) where.paymentDate.gte = new Date(from);
    if (to) {
      const endDate = new Date(to);
      endDate.setDate(endDate.getDate() + 1); // Include the entire 'to' day
      where.paymentDate.lte = endDate;
    }
  }

  if (clientId) {
    where.invoice = { clientId };
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          client: { select: { companyName: true } }
        }
      },
      createdBy: {
        select: { name: true }
      }
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
        method: input.method as string | null,
        category: input.category,
        notes: input.notes as string | null,
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
