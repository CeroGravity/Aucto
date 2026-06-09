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

export type AuthResult = { ok: true } | { ok: false; error: string };

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
export async function loginUser(
  email: string,
  password: string,
  _phone?: string,
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
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
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
