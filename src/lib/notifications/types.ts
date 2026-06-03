import type { OrderLifecycle, PaymentMethod, PaymentStatusValue } from "@/lib/db/schema";

// Minimal order shape the notifiers need (built from the DB order + items).
export type NotifyOrder = {
  id: number;
  totalMinor: number;
  subtotalMinor: number;
  shippingMinor: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatusValue;
  orderStatus: OrderLifecycle;
  trxId: string | null;
  fullName: string;
  area: string;
  city: string;
  phone: string;
  customerEmail: string | null;
  items: Array<{
    productName: string;
    size: string;
    quantity: number;
    unitPriceMinor: number;
  }>;
};

export interface Notifier {
  /** Owner alert (Telegram) — fire-and-forget, must never throw to the caller. */
  notifyNewOrder(order: NotifyOrder): Promise<void>;
  /** Customer receipt (email) — sent only when the order has an email. */
  sendOrderReceipt(order: NotifyOrder): Promise<void>;
}
