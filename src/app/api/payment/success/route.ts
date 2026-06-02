import { type NextRequest, NextResponse } from "next/server";

import { confirmAndFinalize } from "@/lib/orders";

// SSLCommerz POSTs the customer back here. Validate server-side, then redirect
// to the token confirmation page (or back to checkout on failure).
export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "");
  const valId = String(form.get("val_id") ?? "");

  if (!tranId) return NextResponse.redirect(new URL("/checkout", origin), 303);

  const result = await confirmAndFinalize({ tranId, valId });
  if (result.ok) {
    return NextResponse.redirect(new URL(`/order/${result.accessToken}`, origin), 303);
  }
  return NextResponse.redirect(new URL("/checkout", origin), 303);
}
