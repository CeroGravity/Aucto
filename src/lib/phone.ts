import { z } from "zod";

// Bangladesh mobile number. Accepts the common local + international forms:
//   01XXXXXXXXX            (11 digits, leading 0)
//   +8801XXXXXXXXX / 8801… (country code)
// and normalizes to the 11-digit local form (01XXXXXXXXX) for storage.
const BD_MOBILE = /^(?:\+?880|0)1[3-9]\d{8}$/;

export const bdPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => BD_MOBILE.test(v), "Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).")
  .transform(normalizeBdPhone);

// Reduce any accepted form to the 11-digit local form (01XXXXXXXXX).
export function normalizeBdPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("880")) return `0${digits.slice(3)}`;
  return digits;
}
