import { orderReceiptEmail, telegramMessage } from "./format";
import type { Notifier, NotifyOrder } from "./types";

export type CapturedNotification =
  | { kind: "alert"; orderId: number; message: string }
  | { kind: "receipt"; orderId: number; to: string; subject: string };

// In-process capture for tests/dev. Visible to unit tests in the same process;
// logged to the server console so it's observable in dev too.
const captured: CapturedNotification[] = [];

export function getCapturedNotifications(): readonly CapturedNotification[] {
  return captured;
}
export function clearCapturedNotifications(): void {
  captured.length = 0;
}

// Default adapter — no network. Renders the same payloads the real adapters
// send, so tests assert on real formatting.
export class FakeNotifier implements Notifier {
  async notifyNewOrder(order: NotifyOrder): Promise<void> {
    const message = telegramMessage(order);
    captured.push({ kind: "alert", orderId: order.id, message });
    console.info(`[notify:fake] alert order #${order.id}\n${message}`);
  }

  async sendOrderReceipt(order: NotifyOrder): Promise<void> {
    if (!order.customerEmail) return; // no email → no receipt
    const { subject } = orderReceiptEmail(order);
    captured.push({
      kind: "receipt",
      orderId: order.id,
      to: order.customerEmail,
      subject,
    });
    console.info(`[notify:fake] receipt order #${order.id} → ${order.customerEmail} (${subject})`);
  }
}
