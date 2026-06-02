import { type NextRequest, NextResponse } from "next/server";

import { confirmAndFinalize } from "@/lib/orders";

// Local return target for the fake provider. Auto-confirms the success outcome
// through the SAME finalize path the real adapter uses.
export async function GET(req: NextRequest) {
  const tranId = req.nextUrl.searchParams.get("tran_id");
  const outcome = req.nextUrl.searchParams.get("outcome");
  const origin = req.nextUrl.origin;

  if (!tranId || outcome !== "success") {
    return NextResponse.redirect(new URL("/checkout?status=declined", origin));
  }

  const result = await confirmAndFinalize({ tranId });
  if (result.ok) {
    return NextResponse.redirect(new URL(`/order/${result.accessToken}`, origin));
  }
  return NextResponse.redirect(new URL("/checkout?status=declined", origin));
}
