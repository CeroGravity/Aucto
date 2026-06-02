import { z } from "zod";

// Flat shipping for Bangladesh (poisha; ৳60). Single source for the checkout
// summary and the order total.
export const SHIPPING_MINOR = 6000;

// Shared shipping validation (used by the client form and the server action).
export const shippingSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(20),
  address: z.string().trim().min(1, "Address is required.").max(300),
  area: z.string().trim().min(1, "Area / thana is required.").max(120),
  city: z.string().trim().min(1, "City / district is required.").max(120),
  postcode: z.string().trim().max(20).optional(),
});

export type ShippingInput = z.infer<typeof shippingSchema>;
