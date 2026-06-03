import { env } from "@/lib/env";
import { orderReceiptEmail } from "./format";
import type { Notifier, NotifyOrder } from "./types";

// Customer receipt via Resend's REST API (no SDK). Owner alerts are not this
// adapter's job — see CompositeNotifier in index.ts.
export class EmailNotifier implements Notifier {
  async notifyNewOrder(_order: NotifyOrder): Promise<void> {
    // Email doesn't send the owner alert.
  }

  async sendOrderReceipt(order: NotifyOrder): Promise<void> {
    if (!order.customerEmail) return;
    const key = env.RESEND_API_KEY;
    const from = env.EMAIL_FROM;
    if (!key || !from) {
      console.warn("[notify:email] missing RESEND_API_KEY/EMAIL_FROM; skipping");
      return;
    }
    const { subject, html, text } = orderReceiptEmail(order);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: order.customerEmail,
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status}`);
    }
  }
}
