import { z } from "zod";

export const leadSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.enum(["Referral", "Website", "Outbound"]).optional(),
  estimatedValue: z.number().positive().optional(),
  stage: z.enum(["New", "Contacted", "ProposalSent", "Negotiation", "Won", "Lost"]).optional(),
  lostReason: z.enum(["Price", "Competitor", "Timing", "NoBudget", "Other"]).optional(),
});

export const convertLeadSchema = z.object({});

export const markLeadLostSchema = z.object({
  lostReason: z.enum(["Price", "Competitor", "Timing", "NoBudget", "Other"]),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type MarkLeadLostInput = z.infer<typeof markLeadLostSchema>;
