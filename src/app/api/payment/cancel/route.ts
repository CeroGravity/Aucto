import { type NextRequest, NextResponse } from "next/server";

// SSLCommerz cancel return — order stays pending, cart intact.
export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL("/checkout?status=cancelled", req.nextUrl.origin), 303);
}
