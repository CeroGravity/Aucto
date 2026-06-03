import type { PaymentMethod } from "@/lib/db/schema";
import { env } from "@/lib/env";

// Manual payment methods (system of record is our DB; no external infra).
// - cod: pay on delivery → order pending / payment unpaid.
// - bkash|nagad: send to a personal merchant number, submit TrxID + screenshot
//   → order pending / payment awaiting_verification (5d admin verifies).
export type ManualMethod = Extract<PaymentMethod, "cod" | "bkash" | "nagad">;

export const MANUAL_METHODS: readonly ManualMethod[] = ["cod", "bkash", "nagad"];

export function isManualMethod(value: string): value is ManualMethod {
  return (MANUAL_METHODS as readonly string[]).includes(value);
}

export function isMfsMethod(method: ManualMethod): method is "bkash" | "nagad" {
  return method === "bkash" || method === "nagad";
}

// Merchant number to display for an MFS method (from env; "" if unset).
export function mfsNumber(method: "bkash" | "nagad"): string {
  return method === "bkash" ? env.NEXT_PUBLIC_BKASH_NUMBER : env.NEXT_PUBLIC_NAGAD_NUMBER;
}
