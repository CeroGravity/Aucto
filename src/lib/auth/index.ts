import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { z } from "zod";

import { mergeGuestCartIntoUser } from "@/lib/cart";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const credentials = Credentials({
  credentials: { email: {}, password: {} },
  async authorize(raw) {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const email = parsed.data.email.toLowerCase();

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user?.passwordHash) return null;

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return null;

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
});

// OAuth providers are registered ONLY when their env vars are present, so
// dev/CI without credentials still boots and the Credentials path is unaffected.
// allowDangerousEmailAccountLinking links an OAuth sign-in to an existing user
// with the same email — safe here because Google/Facebook return verified
// emails (see report caveat); it avoids the OAuthAccountNotLinked dead-end.
const oauthProviders: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  oauthProviders.push(Google({ allowDangerousEmailAccountLinking: true }));
}
if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
  oauthProviders.push(Facebook({ allowDangerousEmailAccountLinking: true }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [credentials, ...oauthProviders],
  events: {
    // Shared guest→user cart merge for EVERY sign-in method. The Credentials
    // server actions also call this (idempotent), but OAuth has no server action
    // of its own, so the merge must live here to cover Google/Facebook too.
    async signIn({ user }) {
      if (user?.id) {
        await mergeGuestCartIntoUser(user.id).catch(() => {
          // A merge failure must never break sign-in; the user is still authed.
        });
      }
    },
  },
});
