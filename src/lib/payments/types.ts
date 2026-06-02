// Payment provider abstraction. Both the fake and the real SSLCommerz adapter
// follow the same initiate → redirect → confirm flow.

export type PaymentStatus = "paid" | "failed";

export type PaymentCustomer = {
  name: string;
  email?: string | null;
  phone: string;
  address: string;
  city: string;
  postcode?: string | null;
};

// Everything a provider needs to start a hosted payment + build callbacks.
export type InitiateInput = {
  tranId: string;
  amountMinor: number;
  productName: string;
  numItems: number;
  customer: PaymentCustomer;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
};

export type InitiateResult = { redirectUrl: string };

export type ConfirmInput = {
  tranId: string;
  // SSLCommerz validation id from the success/IPN callback.
  valId?: string;
  // Expected total (poisha) — the provider must verify the gateway amount.
  expectedAmountMinor: number;
};

export type ConfirmResult = { status: PaymentStatus; paymentRef?: string };

export interface PaymentProvider {
  /** Create a hosted payment; returns the URL to redirect the customer to. */
  initiatePayment(input: InitiateInput): Promise<InitiateResult>;
  /** Server-side validation of a return/IPN; never trust redirect params alone. */
  confirmPayment(input: ConfirmInput): Promise<ConfirmResult>;
}
