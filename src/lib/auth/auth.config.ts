import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no DB / bcrypt / adapter) — shared by the Node auth
// instance and by middleware. Real providers are added in the Node config.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/account");
      if (isProtected) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (token.role === "user" || token.role === "admin") {
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
