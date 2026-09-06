import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export async function getOverdueHosting(_req: Request, res: Response): Promise<void> {
  const now = new Date();

  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      hostingFeeAmount: { not: null },
    },
    include: {
      invoices: {
        where: {
          deletedAt: null,
          status: { in: ["Sent", "PartiallyPaid"] },
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  const overdueClients = clients
    .map((client) => {
      const overdueInvoices = client.invoices.filter(
        (inv) => new Date(inv.dueDate) < now
      );
      if (overdueInvoices.length === 0) return null;

      const totalOverdue = overdueInvoices.reduce(
        (sum: number, inv: {
          payments?: { amount: number }[];
          creditNotes?: { amount: number }[];
          totalAmount: number;
        }) => {
          const paid = inv.payments?.reduce((s: number, p: { amount: number }) => s + p.amount, 0) ?? 0;
          const credits = inv.creditNotes?.reduce((s: number, c: { amount: number }) => s + c.amount, 0) ?? 0;
          return sum + (inv.totalAmount - paid - credits);
        },
        0
      );

      const oldestDueDate = new Date(Math.min(...overdueInvoices.map((i: { dueDate: Date }) => i.dueDate.getTime())));
      const daysOverdue = Math.floor((now.getTime() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        clientId: client.id,
        companyName: client.companyName,
        hostingFeeAmount: client.hostingFeeAmount,
        hostingCycle: client.hostingCycle,
        totalOverdue,
        daysOverdue,
        oldestInvoice: overdueInvoices[0],
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  res.status(200).json({
    success: true,
    data: overdueClients,
  });
}
