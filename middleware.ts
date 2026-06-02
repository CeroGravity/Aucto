import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/auth.config";

// Edge middleware uses only the edge-safe config (JWT decode + authorized
// callback). Protects /account; logged-out users are redirected to /login.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/account/:path*"],
};
