"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { decryptSecret, encryptSecret } from "@/lib/2fa/crypto";
import {
  generateBackupCodes,
  generateTotpSecret,
  normalizeBackupCode,
  totpAuthUri,
  verifyTotp,
} from "@/lib/2fa/totp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { twoFactorBackupCodes, users } from "@/lib/db/schema";

type EnrollResult =
  | { ok: true; secret: string; otpauthUri: string; qrDataUrl: string }
  | { ok: false; error: string };

type ConfirmResult = { ok: true; backupCodes: string[] } | { ok: false; error: string };

type SimpleResult = { ok: true } | { ok: false; error: string };

// Only email/password accounts can enroll (Google accounts use Google's own
// 2FA). Returns the signed-in user with their auth fields, or null.
async function requireCredentialsUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      passwordHash: true,
      totpEnabled: true,
      totpSecretEnc: true,
    },
  });
  if (!user?.passwordHash) return null; // OAuth-only → gated out.
  return user;
}

// Step 1: generate a fresh secret, store it ENCRYPTED (not yet enabled), and
// return the QR + manual key. Re-enrolling overwrites any pending secret.
export async function startTwoFactorEnrollment(): Promise<EnrollResult> {
  const user = await requireCredentialsUser();
  if (!user) return { ok: false, error: "Two-factor isn’t available for this account." };
  if (user.totpEnabled) return { ok: false, error: "Two-factor is already enabled." };

  const secret = generateTotpSecret();
  const otpauthUri = totpAuthUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });

  await db
    .update(users)
    .set({ totpSecretEnc: encryptSecret(secret) })
    .where(eq(users.id, user.id));

  return { ok: true, secret, otpauthUri, qrDataUrl };
}

// Step 2: confirm enrollment with a valid code → enable 2FA + issue one-time
// backup codes (shown ONCE). A wrong code does NOT enable.
export async function confirmTwoFactorEnrollment(code: string): Promise<ConfirmResult> {
  const user = await requireCredentialsUser();
  if (!user) return { ok: false, error: "Two-factor isn’t available for this account." };
  if (user.totpEnabled) return { ok: false, error: "Two-factor is already enabled." };
  if (!user.totpSecretEnc) return { ok: false, error: "Start enrollment first." };

  let secret: string;
  try {
    secret = decryptSecret(user.totpSecretEnc);
  } catch {
    return { ok: false, error: "Enrollment is corrupted — start again." };
  }
  if (!verifyTotp(secret, code)) {
    return { ok: false, error: "That code didn’t match. Check your authenticator app." };
  }

  const plainCodes = generateBackupCodes();
  const codeRows = await Promise.all(
    plainCodes.map(async (c) => ({
      userId: user.id,
      codeHash: await bcrypt.hash(normalizeBackupCode(c), 10),
    })),
  );

  await db.transaction(async (tx) => {
    // Fresh enable → clear any stale codes, then enable + insert the new set.
    await tx.delete(twoFactorBackupCodes).where(eq(twoFactorBackupCodes.userId, user.id));
    await tx
      .update(users)
      .set({ totpEnabled: true, twoFactorFailedCount: 0, twoFactorLockedUntil: null })
      .where(eq(users.id, user.id));
    await tx.insert(twoFactorBackupCodes).values(codeRows);
  });

  revalidatePath("/account");
  return { ok: true, backupCodes: plainCodes };
}

// Disable 2FA. Requires a current valid TOTP code OR the account password.
// Clears the secret + all backup codes.
export async function disableTwoFactor(input: {
  code?: string;
  password?: string;
}): Promise<SimpleResult> {
  const user = await requireCredentialsUser();
  if (!user) return { ok: false, error: "Two-factor isn’t available for this account." };
  if (!user.totpEnabled || !user.totpSecretEnc) {
    return { ok: false, error: "Two-factor isn’t enabled." };
  }

  let authorized = false;
  const code = input.code?.trim();
  if (code) {
    try {
      authorized = verifyTotp(decryptSecret(user.totpSecretEnc), code);
    } catch {
      authorized = false;
    }
  }
  if (!authorized && input.password && user.passwordHash) {
    authorized = await bcrypt.compare(input.password, user.passwordHash);
  }
  if (!authorized) {
    return { ok: false, error: "Enter a valid code or your password to disable." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(twoFactorBackupCodes).where(eq(twoFactorBackupCodes.userId, user.id));
    await tx
      .update(users)
      .set({
        totpEnabled: false,
        totpSecretEnc: null,
        twoFactorFailedCount: 0,
        twoFactorLockedUntil: null,
      })
      .where(eq(users.id, user.id));
  });

  revalidatePath("/account");
  return { ok: true };
}
