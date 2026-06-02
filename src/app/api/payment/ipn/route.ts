import { type NextRequest, NextResponse } from "next/server";

import { confirmAndFinalize } from "@/lib/orders";

// Server-to-server IPN. Validates + finalizes idempotently (a no-op if the
// success redirect already finalized the order). Always 200 so SSLCommerz
// doesn't retry indefinitely.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "");
  const valId = String(form.get("val_id") ?? "");

  if (tranId) {
    await confirmAndFinalize({ tranId, valId });
  }
  return NextResponse.json({ ok: true });
}
