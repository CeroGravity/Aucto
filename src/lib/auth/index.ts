import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { verifyTwoFactor } from "@/lib/2fa/verify";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  // Optional 2FA code (TOTP or backup code). Only consulted when the account
  // has 2FA enabled; absent on the first login step.
  code: z.string().optional(),
});

// Distinct, non-account-leaking signals the login UI keys off `error.code`.
// `TwoFactorRequired` tells the UI to reveal the code field; `TwoFactorInvalid`
// /`TwoFactorLocked` report a bad/locked code WITHOUT confirming the password
// was right to an unauthenticated caller beyond the 2FA step already reached.
export class TwoFactorRequiredError extends CredentialsSignin {
  code = "TwoFactorRequired";
}
export class TwoFactorInvalidError extends CredentialsSignin {
  code = "TwoFactorInvalid";
}
export class TwoFactorLockedError extends CredentialsSignin {
  code = "TwoFactorLocked";
}

const credentials = Credentials({
  credentials: { email: {}, password: {}, code: {} },
  async authorize(raw) {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const email = parsed.data.email.toLowerCase();

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user?.passwordHash) return null;

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return null;

    // 2FA gate: password is correct, but an enabled account also needs a valid
    // code before a session is issued. No code yet → signal the UI to ask.
    if (user.totpEnabled) {
      const code = parsed.data.code ?? "";
      if (!code.trim()) throw new TwoFactorRequiredError();
      const result = await verifyTwoFactor(user, code);
      if (!result.ok) {
        if (result.reason === "locked") throw new TwoFactorLockedError();
        throw new TwoFactorInvalidError();
      }
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
});

// Google OAuth is registered ONLY when its env vars are present, so dev/CI
// without credentials still boots and the Credentials path is unaffected.
// allowDangerousEmailAccountLinking links a Google sign-in to an existing user
// with the same email — safe because Google returns a verified email; it avoids
// the OAuthAccountNotLinked dead-end. (Facebook was dropped: it can't return an
// email without App Review's Advanced Access.)
const oauthProviders: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  oauthProviders.push(Google({ allowDangerousEmailAccountLinking: true }));
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
    // server actions also call this (idempotent), but Google has no server action
    // of its own, so the merge must live here to cover OAuth too.
    async signIn({ user }) {
      if (user?.id) {
        await mergeGuestCartIntoUser(user.id).catch(() => {
          // A merge failure must never break sign-in; the user is still authed.
        });
      }
    },
  },
});
