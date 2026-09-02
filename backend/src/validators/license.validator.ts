import { z } from "zod";

export const licenseSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  productId: z.string().min(1, "Product ID is required"),
  type: z.enum(["Perpetual", "Subscription", "Leased"]),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)).optional().or(z.literal("")),
  seats: z.number().int().positive().optional(),
});

export const licenseQuerySchema = z.object({
  expiringWithin: z.string().regex(/^\d+$/).transform(Number).optional(),
  clientId: z.string().optional(),
});

export type LicenseInput = z.infer<typeof licenseSchema>;
export type LicenseQueryInput = z.infer<typeof licenseQuerySchema>;
