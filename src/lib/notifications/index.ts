import { env } from "@/lib/env";
import { EmailNotifier } from "./email";
import { FakeNotifier } from "./fake";
import { TelegramNotifier } from "./telegram";
import type { Notifier, NotifyOrder } from "./types";

// In "real" mode: owner alert → Telegram, customer receipt → Email. Each
// channel is isolated so one failing doesn't suppress the other.
class CompositeNotifier implements Notifier {
  private telegram = new TelegramNotifier();
  private email = new EmailNotifier();

  async notifyNewOrder(order: NotifyOrder): Promise<void> {
    await this.telegram.notifyNewOrder(order);
  }
  async sendOrderReceipt(order: NotifyOrder): Promise<void> {
    await this.email.sendOrderReceipt(order);
  }
}

// Test-only: always throws, to prove dispatch is non-blocking.
class ThrowingNotifier implements Notifier {
  async notifyNewOrder(): Promise<void> {
    throw new Error("notifier boom (test)");
  }
  async sendOrderReceipt(): Promise<void> {
    throw new Error("notifier boom (test)");
  }
}

function pickNotifier(): Notifier {
  switch (env.NOTIFY_PROVIDER) {
    case "real":
      return new CompositeNotifier();
    case "throw":
      return new ThrowingNotifier();
    default:
      return new FakeNotifier();
  }
}

export const notifier: Notifier = pickNotifier();

export {
  clearCapturedNotifications,
  getCapturedNotifications,
} from "./fake";
export type { Notifier, NotifyOrder } from "./types";
