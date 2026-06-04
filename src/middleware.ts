import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/auth.config";

// Edge middleware. Two concerns:
//   1. Real 404s for the storefront PDP. `notFound()` in an awaited dynamic page
//      only yields a soft-404 (HTTP 200) once the response streams (documented
//      Next limitation, issues #76474/#77235), and Node-runtime middleware
//      isn't available on this Next version. So we probe an internal Node route
//      (/api/products/[slug]) for existence and, when missing, rewrite to the
//      not-found UI with a real 404 status — before the page renders.
//   2. The existing NextAuth gate for /account (edge-safe authConfig).
const { auth } = NextAuth(authConfig);

const PRODUCT_SLUG = /^\/products\/([^/]+)$/;

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  const match = pathname.match(PRODUCT_SLUG);
  if (match) {
    const slug = match[1] ?? "";
    const probe = await fetch(new URL(`/api/products/${slug}`, req.nextUrl.origin), {
      headers: { "x-mw-probe": "1" },
    });
    if (probe.status === 404) {
      // Rewrite to the global not-found UI and force the 404 status. Rewrites
      // preserve the URL bar while serving the not-found render.
      return NextResponse.rewrite(new URL("/_not-found", req.nextUrl.origin), { status: 404 });
    }
    return NextResponse.next();
  }

  // /account handled by the authConfig `authorized` callback (redirect to
  // /login when logged out).
  return undefined;
});

export const config = {
  matcher: ["/products/:slug", "/account/:path*"],
};
