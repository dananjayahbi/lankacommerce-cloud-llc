import { z } from "zod/v4";

export const productStep1Schema = z.object({
  name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(120, "Product name must be at most 120 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
    .or(z.literal("")),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS", "OTHER"], {
    error: "Please select a gender",
  }),
  tags: z.array(z.string()).max(20, "Maximum 20 tags allowed").default([]),
  tax_rule: z.enum(["STANDARD_VAT", "REDUCED_VAT", "ZERO_RATED", "EXEMPT"]).default("STANDARD_VAT"),
});

export type ProductStep1Data = z.infer<typeof productStep1Schema>;

export const variantRowSchema = z.object({
  combinationKey: z.string(),
  size: z.string(),
  colour: z.string(),
  sku: z.string().min(1, "SKU is required"),
  costPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .or(z.literal("")),
  retailPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .or(z.literal("")),
  wholesalePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .or(z.literal(""))
    .optional(),
  lowStockThreshold: z.number().int().min(0).default(5),
  selected: z.boolean().default(true),
});

export const productStep2Schema = z.object({
  sizes: z.array(z.string()),
  colours: z.array(z.string()),
  variants: z.array(variantRowSchema),
});

export type ProductStep2Data = z.infer<typeof productStep2Schema>;
export type VariantRow = z.infer<typeof variantRowSchema>;
