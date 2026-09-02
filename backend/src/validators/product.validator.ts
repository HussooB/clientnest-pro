import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  basePrice: z.number().positive("Base price must be positive"),
});

export type ProductInput = z.infer<typeof productSchema>;
