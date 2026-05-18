import { z } from "zod/v4";

export const variantEditSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional().or(z.literal("")),
  size: z.string().min(1, "Size is required"),
  colour: z.string().min(1, "Colour is required"),
  cost_price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .optional()
    .or(z.literal("")),
  retail_price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
  wholesale_price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .optional()
    .or(z.literal("")),
  low_stock_threshold: z.number().int().min(0).default(5),
  images: z.array(z.string()).optional(),
});

export type VariantEditData = z.infer<typeof variantEditSchema>;
