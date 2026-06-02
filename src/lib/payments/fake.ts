import { randomBytes } from "node:crypto";

import type { PaymentOrder, PaymentProvider, PaymentResult, PaymentStatus } from "./types";

// Deterministic, no-network fake provider for tests and pre-sandbox dev.
// Outcome rules (in order):
//   1. explicit `testOutcome` on the order, else
//   2. amount ending in "13" poisha (totalMinor % 100 === 13) → failure,
//   3. otherwise success.
// The "...13" rule lets e2e force a failure deterministically via the cart
// total without any flags plumbed through the UI.
function decideOutcome(order: PaymentOrder): PaymentStatus {
  if (order.testOutcome) return order.testOutcome;
  if (order.amountMinor % 100 === 13) return "failed";
  return "paid";
}

const statusByRef = new Map<string, PaymentStatus>();

export class FakePaymentProvider implements PaymentProvider {
  async createPayment(order: PaymentOrder): Promise<PaymentResult> {
    const status = decideOutcome(order);
    const ref = `fake_${randomBytes(8).toString("hex")}`;
    statusByRef.set(ref, status);
    return { ref, status };
  }

  async getStatus(ref: string): Promise<PaymentStatus> {
    return statusByRef.get(ref) ?? "failed";
  }
}
