import type { OrderLifecycle, PaymentStatusValue } from "@/lib/db/schema";

// --- Order (fulfilment) lifecycle transitions ---
// Allowed next states for each order status. Empty = terminal.
export const ORDER_TRANSITIONS: Record<OrderLifecycle, OrderLifecycle[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  returned: [],
};

export function canTransitionOrder(from: OrderLifecycle, to: OrderLifecycle): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

// Cancelling restores reserved stock; only pre-fulfilment states can cancel.
export function canCancel(status: OrderLifecycle): boolean {
  return canTransitionOrder(status, "cancelled");
}

// --- Payment transitions ---
// MFS verification: awaiting_verification → paid | rejected.
// COD: unpaid → paid (on delivery/collection).
export const PAYMENT_TRANSITIONS: Record<PaymentStatusValue, PaymentStatusValue[]> = {
  unpaid: ["paid"],
  awaiting_verification: ["paid", "rejected"],
  paid: [],
  rejected: [],
};

export function canTransitionPayment(from: PaymentStatusValue, to: PaymentStatusValue): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}
