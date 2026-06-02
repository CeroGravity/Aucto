// Payment provider abstraction. Checkout depends ONLY on this interface.
// Phase 5b adds the real card sandbox adapter behind the same contract.

export type PaymentStatus = "paid" | "failed";

export type PaymentResult = {
  ref: string;
  status: PaymentStatus;
};

// Minimal order shape a provider needs to charge.
export type PaymentOrder = {
  orderId: number;
  amountMinor: number;
  // Optional hint used by the fake adapter to force success/failure in tests.
  testOutcome?: PaymentStatus;
};

export interface PaymentProvider {
  /** Charge for an order. Returns a provider ref + final status. */
  createPayment(order: PaymentOrder): Promise<PaymentResult>;
  /** Look up the status of a previously created payment. */
  getStatus(ref: string): Promise<PaymentStatus>;
}
