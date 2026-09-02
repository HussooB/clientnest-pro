import { z } from "zod";

export const invoiceCreateSchema = z.object({
  clientId: z.string().cuid(),
  dueDate: z.coerce.date(),
  subtotal: z.number().positive(),
  taxRatePct: z.number().min(0).max(100).optional().default(0),
  status: z.enum(["Draft", "Sent", "PartiallyPaid", "Paid"]).optional().default("Draft"),
});

export const invoiceUpdateSchema = z.object({
  clientId: z.string().cuid().optional(),
  dueDate: z.coerce.date().optional(),
  subtotal: z.number().positive().optional(),
  taxRatePct: z.number().min(0).max(100).optional(),
  status: z.enum(["Draft", "Sent", "PartiallyPaid", "Paid"]).optional(),
});

export const paymentCreateSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.number().positive(),
  method: z.string().optional(),
  category: z.enum(["Hosting", "Maintenance", "Upgrade", "License"]),
  notes: z.string().optional(),
});

export const creditNoteCreateSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.number().positive(),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type CreditNoteCreateInput = z.infer<typeof creditNoteCreateSchema>;
