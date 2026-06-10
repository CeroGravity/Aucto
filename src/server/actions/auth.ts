"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { z } from "zod";

import { auth, signIn, signOut } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { bdPhoneSchema } from "@/lib/phone";

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string }
  // Password was correct but the account has 2FA enabled — the UI reveals a code
  // field and resubmits with the code. `locked` flags the brute-force lockout.
  | { ok: false; twoFactorRequired: true; locked?: boolean; error?: string };

const registerSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  // BD mobile, required for email/password sign-ups (COD needs it; prefills
  // checkout). Validated + normalized to 01XXXXXXXXX.
  phone: bdPhoneSchema,
});

const loginSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export async function registerUser(
  email: string,
  password: string,
  phone: string,
): Promise<AuthResult> {
  const parsed = registerSchema.safeParse({ email, password, phone });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const normalizedEmail = parsed.data.email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    columns: { id: true },
  });
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await db
    .insert(users)
    .values({ email: normalizedEmail, passwordHash, phone: parsed.data.phone, role: "user" })
    .returning({ id: users.id });
  if (!user) return { ok: false, error: "Could not create account." };

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    return { ok: false, error: "Account created, but sign-in failed." };
  }

  await mergeGuestCartIntoUser(user.id);
  return { ok: true };
}

// `_phone` is accepted (ignored) so login shares the AuthForm action signature.
// `code` carries the 2FA code on the resubmit after the password step.
export async function loginUser(
  email: string,
  password: string,
  _phone?: string,
  code?: string,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const normalizedEmail = parsed.data.email.toLowerCase();

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password: parsed.data.password,
      code: code ?? "",
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The authorize() 2FA branch throws CredentialsSignin subclasses whose
      // `.code` propagates onto the AuthError — map them to UI signals.
      const authCode = (error as AuthError & { code?: string }).code;
      if (authCode === "TwoFactorRequired") return { ok: false, twoFactorRequired: true };
      if (authCode === "TwoFactorLocked") {
        return {
          ok: false,
          twoFactorRequired: true,
          locked: true,
          error: "Too many attempts. Try again in 15 minutes.",
        };
      }
      if (authCode === "TwoFactorInvalid") {
        return { ok: false, twoFactorRequired: true, error: "Invalid code. Try again." };
      }
      return { ok: false, error: "Invalid email or password." };
    }
    throw error;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    columns: { id: true },
  });
  if (user) await mergeGuestCartIntoUser(user.id);

  return { ok: true };
}

export async function logoutUser(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

// Change the signed-in user's password. Requires the current password (so a
// stolen session can't silently rotate it). OAuth-only accounts (no
// passwordHash) sign in with Google and have no password to change.
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return { ok: false, error: "This account signs in with Google; no password to change." };
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) return { ok: false, error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  return { ok: true };
}

// Set/update the signed-in user's phone (account settings). BD-validated +
// normalized. Google users use this to add the phone Google can't provide.
export async function updatePhone(phone: string): Promise<AuthResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  const parsed = bdPhoneSchema.safeParse(phone);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid phone." };
  }

  await db.update(users).set({ phone: parsed.data }).where(eq(users.id, userId));
  revalidatePath("/account");
  return { ok: true };
}
