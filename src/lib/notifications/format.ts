import { env } from "@/lib/env";
import { formatPriceMinor } from "@/lib/money";
import type { NotifyOrder } from "./types";

const METHOD_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  fake: "Card",
  sslcommerz: "Card",
};

// COD = pay on delivery; MFS = awaiting verification. Shared by email + alert.
export function paymentLine(order: NotifyOrder): string {
  if (order.paymentMethod === "cod") {
    return `Pay ${formatPriceMinor(order.totalMinor)} on delivery.`;
  }
  if (order.paymentStatus === "awaiting_verification") {
    return `Payment under verification${order.trxId ? ` — TrxID ${order.trxId}` : ""}.`;
  }
  return `Payment: ${order.paymentStatus}.`;
}

// Concise owner alert (Telegram). Links to the admin order detail.
export function telegramMessage(order: NotifyOrder): string {
  const url = `${env.APP_URL}/admin/orders/${order.id}`;
  return [
    `🛒 New order #${order.id}`,
    `${formatPriceMinor(order.totalMinor)} · ${METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}`,
    `${order.fullName} · ${order.area}, ${order.city}`,
    `📞 ${order.phone}`,
    url,
  ].join("\n");
}

export type RenderedEmail = { subject: string; html: string; text: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Branded receipt (navy + wordmark) with a plaintext fallback.
export function orderReceiptEmail(order: NotifyOrder): RenderedEmail {
  const subject = `Aucto — order #${order.id} confirmed`;
  const pay = paymentLine(order);
  const fb = env.NEXT_PUBLIC_FACEBOOK_URL;

  const lines = order.items.map(
    (i) =>
      `${i.productName} · ${i.size} × ${i.quantity} — ${formatPriceMinor(i.unitPriceMinor * i.quantity)}`,
  );

  const text = [
    `AUCTO — Move with Power`,
    ``,
    `Thank you, ${order.fullName}! Your order #${order.id} is confirmed.`,
    ``,
    ...lines,
    ``,
    `Subtotal: ${formatPriceMinor(order.subtotalMinor)}`,
    `Shipping: ${formatPriceMinor(order.shippingMinor)}`,
    `Total: ${formatPriceMinor(order.totalMinor)}`,
    ``,
    pay,
    fb ? `\nMessage us on Facebook: ${fb}` : ``,
  ].join("\n");

  const itemRows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0;color:#6b7280">${escapeHtml(i.productName)} · ${i.size} × ${i.quantity}</td><td style="padding:4px 0;text-align:right">${formatPriceMinor(i.unitPriceMinor * i.quantity)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111111">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#1b2a4d;color:#ffffff;padding:20px 24px;border-radius:12px 12px 0 0;font-weight:800;letter-spacing:1px">AUCTO</div>
    <div style="background:#ffffff;padding:24px;border-radius:0 0 12px 12px">
      <h1 style="font-size:20px;margin:0 0 8px">Order #${order.id} confirmed</h1>
      <p style="color:#6b7280;margin:0 0 16px">Thank you, ${escapeHtml(order.fullName)} — we've received your order.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${itemRows}</table>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0">
      <table style="width:100%;font-size:14px">
        <tr><td style="color:#6b7280">Subtotal</td><td style="text-align:right">${formatPriceMinor(order.subtotalMinor)}</td></tr>
        <tr><td style="color:#6b7280">Shipping</td><td style="text-align:right">${formatPriceMinor(order.shippingMinor)}</td></tr>
        <tr><td style="font-weight:700;padding-top:6px">Total</td><td style="text-align:right;font-weight:700;padding-top:6px">${formatPriceMinor(order.totalMinor)}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-weight:600">${escapeHtml(pay)}</p>
      ${fb ? `<p style="margin:16px 0 0"><a href="${escapeHtml(fb)}" style="color:#1b2a4d">Message us on Facebook</a></p>` : ""}
    </div>
  </div></body></html>`;

  return { subject, html, text };
}
