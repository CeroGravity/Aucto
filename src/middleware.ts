import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/auth.config";

// Edge middleware: the NextAuth gate for /account (edge-safe authConfig). The
// `authorized` callback redirects logged-out users to /login.
//
// Storefront 404s for missing/draft/archived products are handled by the page's
// notFound() + the noindex not-found page (the previous DB-backed Edge probe was
// dropped in 7a: it added a per-PDP internal fetch + DB hit and had a publish
// revalidation race; crawlers are covered by noindex, which is the right
// production trade-off).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/account/:path*"],
};
