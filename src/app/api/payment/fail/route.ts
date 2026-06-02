import { type NextRequest, NextResponse } from "next/server";

// SSLCommerz failure return — leave the order pending, send the customer back
// to checkout. (No finalize, no decrement.)
export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL("/checkout?status=failed", req.nextUrl.origin), 303);
}
