import { FakePaymentProvider } from "./fake";
import type { PaymentProvider } from "./types";

// Single place to swap the active provider. Phase 5b returns the real card
// sandbox adapter here (behind the same PaymentProvider interface).
export const paymentProvider: PaymentProvider = new FakePaymentProvider();

export type {
  PaymentOrder,
  PaymentProvider,
  PaymentResult,
  PaymentStatus,
} from "./types";
