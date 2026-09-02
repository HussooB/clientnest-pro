import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  taxId: z.string().optional(),
  billingAddress: z.string().optional(),
  industryType: z.string().optional(),
  status: z.enum(["Prospect", "Active", "OnHold", "Churned"]).optional(),
  accountOwnerId: z.string().optional(),
  taxRatePct: z.number().min(0).max(100).optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  contactType: z.enum(["Technical", "Billing", "Executive"]),
  notifyEmail: z.boolean().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
