import { z } from "zod";

// Shared product/variant validation (client form + server actions).
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  description: z.string().trim().min(1, "Description is required.").max(2000),
  categoryId: z.coerce.number().int().positive("Choose a category."),
  // Taka string from the form; converted to poisha in the action.
  price: z.string().trim().min(1, "Price is required."),
  published: z.coerce.boolean().default(false),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const variantSchema = z.object({
  size: z.enum(SIZES),
  stock: z.coerce.number().int().min(0, "Stock can't be negative."),
});

export const stockAdjustSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().min(0, "Stock can't be negative."),
});

export function productSlug(name: string): string {
  return slugify(name);
}
