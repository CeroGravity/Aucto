import { env } from "@/lib/env";
import { telegramMessage } from "./format";
import type { Notifier, NotifyOrder } from "./types";

// Owner alert via the Telegram Bot HTTP API (no SDK). Email receipts are not
// this adapter's job — see CompositeNotifier in index.ts.
export class TelegramNotifier implements Notifier {
  async notifyNewOrder(order: NotifyOrder): Promise<void> {
    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.warn("[notify:telegram] missing TELEGRAM_BOT_TOKEN/CHAT_ID; skipping");
      return;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage(order),
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`Telegram sendMessage failed: ${res.status}`);
    }
  }

  async sendOrderReceipt(_order: NotifyOrder): Promise<void> {
    // Telegram doesn't send customer receipts.
  }
}
