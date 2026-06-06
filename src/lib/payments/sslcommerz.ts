// ⚠ INTENTIONALLY SHELVED — not dead code. A complete, tested SSLCommerz gateway
// adapter kept behind PAYMENT_PROVIDER=sslcommerz for a future card-gateway
// launch. Today's live payment path is COD + manual bKash/Nagad (see manual.ts);
// this is selected via env in payments/index.ts. Do not delete.
import { env } from "@/lib/env";
import type {
  ConfirmInput,
  ConfirmResult,
  InitiateInput,
  InitiateResult,
  PaymentProvider,
} from "./types";

// SSLCommerz v4 REST adapter (sandbox by default; live via SSLCZ_IS_LIVE).
// Docs: https://developer.sslcommerz.com/doc/v4/
const SANDBOX = "https://sandbox.sslcommerz.com";
const LIVE = "https://securepay.sslcommerz.com";

function baseUrl(): string {
  return env.SSLCZ_IS_LIVE === "true" ? LIVE : SANDBOX;
}

function credentials(): { storeId: string; storePasswd: string } {
  const storeId = env.SSLCZ_STORE_ID;
  const storePasswd = env.SSLCZ_STORE_PASSWD;
  if (!storeId || !storePasswd) {
    throw new Error("SSLCommerz credentials missing (SSLCZ_STORE_ID / SSLCZ_STORE_PASSWD).");
  }
  return { storeId, storePasswd };
}

// poisha → BDT decimal string (gateway works in major-unit decimals).
function toTaka(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export class SslcommerzProvider implements PaymentProvider {
  async initiatePayment(input: InitiateInput): Promise<InitiateResult> {
    const { storeId, storePasswd } = credentials();

    const body = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePasswd,
      total_amount: toTaka(input.amountMinor),
      currency: "BDT",
      tran_id: input.tranId,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      cancel_url: input.cancelUrl,
      ipn_url: input.ipnUrl,
      product_name: input.productName,
      product_category: "apparel",
      product_profile: "physical-goods",
      shipping_method: "Courier",
      num_of_item: String(input.numItems),
      cus_name: input.customer.name,
      cus_email: input.customer.email ?? "guest@aucto.example",
      cus_phone: input.customer.phone,
      cus_add1: input.customer.address,
      cus_city: input.customer.city,
      cus_postcode: input.customer.postcode ?? "0000",
      cus_country: "Bangladesh",
      ship_name: input.customer.name,
      ship_add1: input.customer.address,
      ship_city: input.customer.city,
      ship_postcode: input.customer.postcode ?? "0000",
      ship_country: "Bangladesh",
    });

    const res = await fetch(`${baseUrl()}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as {
      status?: string;
      GatewayPageURL?: string;
      failedreason?: string;
    };

    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      throw new Error(
        `SSLCommerz initiate failed: ${data.failedreason ?? data.status ?? "unknown"}`,
      );
    }
    return { redirectUrl: data.GatewayPageURL };
  }

  async confirmPayment(input: ConfirmInput): Promise<ConfirmResult> {
    if (!input.valId) return { status: "failed" };
    const { storeId, storePasswd } = credentials();

    // Validator API — authoritative, server-side. Never trust redirect params.
    const url = new URL(`${baseUrl()}/validator/api/validationserverAPI.php`);
    url.searchParams.set("val_id", input.valId);
    url.searchParams.set("store_id", storeId);
    url.searchParams.set("store_passwd", storePasswd);
    url.searchParams.set("format", "json");

    const res = await fetch(url, { method: "GET" });
    const data = (await res.json()) as {
      status?: string;
      tran_id?: string;
      amount?: string;
      currency_type?: string;
      bank_tran_id?: string;
    };

    const statusOk = data.status === "VALID" || data.status === "VALIDATED";
    const tranOk = data.tran_id === input.tranId;
    // Gateway amount must match the order total (guard against tampering).
    const amountOk =
      typeof data.amount === "string" &&
      Math.round(Number(data.amount) * 100) === input.expectedAmountMinor;

    if (!statusOk || !tranOk || !amountOk) {
      return { status: "failed" };
    }
    return { status: "paid", paymentRef: data.bank_tran_id ?? input.valId };
  }
}
