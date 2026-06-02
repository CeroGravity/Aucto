import { env } from "@/lib/env";
import { FakePaymentProvider } from "./fake";
import { SslcommerzProvider } from "./sslcommerz";
import type { PaymentProvider } from "./types";

// Active provider chosen by env (PAYMENT_PROVIDER=fake | sslcommerz). Tests and
// credential-less dev use the fake adapter; both implement the same interface.
export const paymentProvider: PaymentProvider =
  env.PAYMENT_PROVIDER === "sslcommerz" ? new SslcommerzProvider() : new FakePaymentProvider();

export type {
  ConfirmInput,
  ConfirmResult,
  InitiateInput,
  InitiateResult,
  PaymentProvider,
  PaymentStatus,
} from "./types";
