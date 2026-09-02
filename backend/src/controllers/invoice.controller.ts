import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { invoiceCreateSchema, invoiceUpdateSchema } from "../validators/invoice.validator";
import { logAudit, getAuditInput } from "../utils/audit";
import type { InvoiceStatus } from "@prisma/client";

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

  const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const creditTotal = invoice.creditNotes.reduce((sum, c) => sum + c.amount, 0);
  const balance = invoice.totalAmount - paidAmount - creditTotal;
  const isOverdue = invoice.status !== "Paid" && new Date(invoice.dueDate) < new Date();

  return { paidAmount, creditTotal, balance, isOverdue };
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const { status, clientId } = req.query;

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
        paidAmount,
        creditTotal,
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
  const { id } = req.params;

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
  const user = req.user!;

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
  const { id } = req.params;
  const input = invoiceUpdateSchema.parse(req.body);
  const user = req.user!;

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
  const { id } = req.params;
  const user = req.user!;

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
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: { id, deletedAt: null },
    include: {
      invoices: {
        where: { deletedAt: null },
        include: {
          payments: true,
          creditNotes: true,
        },
        orderBy: { issueDate: "asc" },
      },
    },
  });

  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  const invoicesWithBalances = await Promise.all(
    client.invoices.map(async (inv) => {
      const paidAmount = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const creditTotal = inv.creditNotes.reduce((sum, c) => sum + c.amount, 0);
      const balance = inv.totalAmount - paidAmount - creditTotal;
      const isOverdue = inv.status !== "Paid" && new Date(inv.dueDate) < new Date();
      return { ...inv, paidAmount, creditTotal, balance, isOverdue };
    })
  );

  const totalOutstanding = invoicesWithBalances.reduce((sum, inv) => sum + inv.balance, 0);
  const totalOverdue = invoicesWithBalances.filter(inv => inv.isOverdue).reduce((sum, inv) => sum + inv.balance, 0);

  let hostingNextDueDate: Date | null = null;
  if (client.hostingFeeAmount && client.hostingCycle) {
    const now = new Date();
    if (client.hostingCycle === "Monthly") {
      hostingNextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      hostingNextDueDate = new Date(now.getFullYear() + 1, 0, 1);
    }
  }

  const soaData = {
    client: {
      id: client.id,
      companyName: client.companyName,
      taxId: client.taxId,
      billingAddress: client.billingAddress,
      taxRatePct: client.taxRatePct,
      hostingFeeAmount: client.hostingFeeAmount,
      hostingCycle: client.hostingCycle,
    },
    hostingNextDueDate,
    invoices: invoicesWithBalances,
    totals: {
      totalOutstanding,
      totalOverdue,
    },
  };

  res.status(200).json({
    success: true,
    data: soaData,
  });
}
