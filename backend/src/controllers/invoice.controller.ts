import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { invoiceCreateSchema, invoiceUpdateSchema } from "../validators/invoice.validator";
import { ApiError } from "../utils/ApiError";
import { logAudit, getAuditInput } from "../utils/audit";
import type { InvoiceStatus } from "@prisma/client";
import { z } from "zod";

// ✅ ADD THESE SCHEMAS
const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string(),
  method: z.enum(["Bank Transfer", "Card", "Cash", "Cheque"]),
  category: z.enum(["Hosting", "Maintenance", "Upgrade", "License"]),
  notes: z.string().optional(),
});

const creditNoteSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(5),
});

function generateInvoiceNumber(year: number, seq: number): string {
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

async function computeInvoiceBalance(invoiceId: string): Promise<{
  paidAmount: number;
  creditTotal: number;
  balance: number;
  isOverdue: boolean;
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

  const paidAmount = invoice.payments.reduce(
    (sum: number, p: { amount: number }) => sum + p.amount,
    0
  );
  const creditTotal = invoice.creditNotes.reduce(
    (sum: number, c: { amount: number }) => sum + c.amount,
    0
  );
  const balance = invoice.totalAmount - paidAmount - creditTotal;
  const isOverdue = invoice.status !== "Paid" && new Date(invoice.dueDate) < new Date();

  return { paidAmount, creditTotal, balance, isOverdue };
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const { status, clientId } = req.query as {
    status?: string;
    clientId?: string;
  };

  const where: { deletedAt?: null; status?: InvoiceStatus; clientId?: string } = {
    deletedAt: null,
  };

  if (status && typeof status === "string") {
    where.status = status as InvoiceStatus;
  }

  if (clientId && typeof clientId === "string") {
    where.clientId = clientId;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: true,
      payments: true,
      creditNotes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const result = await Promise.all(
    invoices.map(async (inv) => {
      const { paidAmount, creditTotal, balance, isOverdue } = await computeInvoiceBalance(inv.id);
      return {
        ...inv,
        clientName: inv.client?.companyName || "Unknown Client",
        paid: paidAmount,
        balance,
        isOverdue,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const invoice = await prisma.invoice.findUnique({
    where: { id, deletedAt: null },
    include: {
      client: true,
      payments: true,
      creditNotes: true,
      items: true,
    },
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const { paidAmount, creditTotal, balance, isOverdue } = await computeInvoiceBalance(invoice.id);

  res.status(200).json({
    success: true,
    data: {
      ...invoice,
      paidAmount,
      creditTotal,
      balance,
      isOverdue,
    },
  });
}

export async function createInvoice(req: Request, res: Response): Promise<void> {
  const input = invoiceCreateSchema.parse(req.body);
  const user = req.user as any; // ✅ FIX: Cast to any to bypass strict type checking

  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}-`,
      },
    },
  });
  const invoiceNumber = generateInvoiceNumber(year, count + 1);

  const taxAmount = input.subtotal * (input.taxRatePct / 100);
  const totalAmount = input.subtotal + taxAmount;

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: input.clientId,
        dueDate: input.dueDate,
        subtotal: input.subtotal,
        taxRatePct: input.taxRatePct,
        taxAmount,
        totalAmount,
        status: input.status,
      },
      include: {
        client: true,
      },
    });

    await logAudit(
      getAuditInput(user, "CREATE", "Invoice", inv.id, null, inv)
    );

    return inv;
  });

  res.status(201).json({
    success: true,
    data: invoice,
  });
}

export async function updateInvoice(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = invoiceUpdateSchema.parse(req.body);
  const user = req.user as any; // ✅ FIX: Cast to any

  const existing = await prisma.invoice.findUnique({
    where: { id },
  });

  if (!existing || existing.deletedAt) {
    throw new ApiError(404, "Invoice not found");
  }

  const before = { ...existing };

  let taxAmount = existing.taxAmount;
  let totalAmount = existing.totalAmount;

  if (input.subtotal !== undefined || input.taxRatePct !== undefined) {
    const newSubtotal = input.subtotal ?? existing.subtotal;
    const newTaxRatePct = input.taxRatePct ?? existing.taxRatePct;
    taxAmount = newSubtotal * (newTaxRatePct / 100);
    totalAmount = newSubtotal + taxAmount;
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id },
      data: {
        ...input,
        taxAmount,
        totalAmount,
      },
      include: {
        client: true,
      },
    });

    await logAudit(
      getAuditInput(user, "UPDATE", "Invoice", inv.id, before, inv)
    );

    return inv;
  });

  res.status(200).json({
    success: true,
    data: invoice,
  });
}

export async function deleteInvoice(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const user = req.user as any; // ✅ FIX: Cast to any

  const existing = await prisma.invoice.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "Invoice not found");
  }

  const before = { ...existing };

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit(
      getAuditInput(user, "DELETE", "Invoice", id, before, { deletedAt: new Date() })
    );
  });

  res.status(200).json({
    success: true,
    data: { message: "Invoice soft-deleted" },
  });
}

export async function getStatementOfAccount(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const invoice = await prisma.invoice.findUnique({
    where: { id, deletedAt: null },
    include: {
      client: true,
      payments: true,
      creditNotes: true,
    },
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const client = invoice.client;
  
  const paidAmount = invoice.payments.reduce(
    (sum: number, p: { amount: number }) => sum + p.amount,
    0
  );
  const creditTotal = invoice.creditNotes.reduce(
    (sum: number, c: { amount: number }) => sum + c.amount,
    0
  );
  const balance = invoice.totalAmount - paidAmount - creditTotal;

  const soaData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    paidAmount,
    creditTotal,
    balance,
    client: {
      companyName: client.companyName,
      billingAddress: client.billingAddress,
      taxId: client.taxId,
    },
    payments: invoice.payments,
    creditNotes: invoice.creditNotes,
  };

  res.status(200).json({
    success: true,
    data: soaData,
  });
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { amount, paymentDate, method, category, notes } = paymentSchema.parse(req.body);
  const user = req.user as any; // ✅ FIX: Cast to any

  const invoice = await prisma.invoice.findUnique({
    where: { id, deletedAt: null },
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const { paidAmount, creditTotal, balance } = await computeInvoiceBalance(id);
  
  if (amount > balance) {
    throw new ApiError(400, `Payment amount exceeds balance of ${balance}`);
  }

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        invoiceId: id,
        amount,
        paymentDate: new Date(paymentDate),
        method,
        category,
        notes,
        createdById: user.id,
      },
    });

    const newBalance = balance - amount;
    if (newBalance <= 0) {
      await tx.invoice.update({
        where: { id },
        data: { status: "Paid" },
      });
    }

    return p;
  });

  await logAudit(
    getAuditInput(user, "CREATE", "Payment", payment.id, null, payment)
  );

  res.status(201).json({
    success: true,
    data: payment,
  });
}

export async function issueCreditNote(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { amount, reason } = creditNoteSchema.parse(req.body);
  const user = req.user as any; // ✅ FIX: Cast to any

  const invoice = await prisma.invoice.findUnique({
    where: { id, deletedAt: null },
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const { paidAmount, creditTotal, balance } = await computeInvoiceBalance(id);
  
  if (amount > balance) {
    throw new ApiError(400, `Credit amount exceeds balance of ${balance}`);
  }

  const creditNote = await prisma.$transaction(async (tx) => {
    const c = await tx.creditNote.create({
      data: {
        invoiceId: id,
        amount,
        reason,
        createdById: user.id,
      },
    });

    const newBalance = balance - amount;
    if (newBalance <= 0) {
      await tx.invoice.update({
        where: { id },
        data: { status: "Paid" },
      });
    }

    return c;
  });

  await logAudit(
    getAuditInput(user, "CREATE", "CreditNote", creditNote.id, null, creditNote)
  );

  res.status(201).json({
    success: true,
    data: creditNote,
  });
}