import { randomBytes } from "node:crypto";

import { env } from "@/lib/env";
import type {
  ConfirmInput,
  ConfirmResult,
  InitiateInput,
  InitiateResult,
  PaymentProvider,
} from "./types";

// Deterministic, no-network fake provider. initiatePayment returns a local
// route that auto-confirms; the decline sentinel (customer name "test decline")
// routes to the fail outcome. confirmPayment then validates server-side via the
// SAME code path the real adapter uses.
export class FakePaymentProvider implements PaymentProvider {
  async initiatePayment(input: InitiateInput): Promise<InitiateResult> {
    const outcome =
      input.customer.name.trim().toLowerCase() === "test decline" ? "fail" : "success";
    const url = new URL("/api/payment/fake-return", env.APP_URL);
    url.searchParams.set("tran_id", input.tranId);
    url.searchParams.set("outcome", outcome);
    return { redirectUrl: url.toString() };
  }

  async confirmPayment(_input: ConfirmInput): Promise<ConfirmResult> {
    // The fake-return route only confirms the success outcome, so reaching here
    // means "paid". No gateway amount to validate in the fake.
    return {
      status: "paid",
      paymentRef: `fake_${randomBytes(8).toString("hex")}`,
    };
  }
}
