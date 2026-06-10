import type { OrderLifecycle, PaymentStatusValue } from "@/lib/db/schema";

// Customer-facing labels for the fulfilment + payment state. Pure (no db), so
// both Server and Client components can render order status consistently.
export const ORDER_STATUS_LABEL: Record<OrderLifecycle, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatusValue, string> = {
  unpaid: "Unpaid",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  rejected: "Rejected",
};
