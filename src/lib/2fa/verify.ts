import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { decryptSecret } from "@/lib/2fa/crypto";
import { normalizeBackupCode, verifyTotp } from "@/lib/2fa/totp";
import { db } from "@/lib/db";
import { twoFactorBackupCodes, users } from "@/lib/db/schema";

// Brute-force throttle on the 6-digit code step: after MAX_FAILURES bad codes,
// lock the user's 2FA verification for LOCK_MS. Applies to BOTH TOTP and backup
// codes (a backup code is also guessable). DB-backed so it survives restarts and
// is shared across requests.
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000; // 15 minutes

export type TwoFactorResult = { ok: true } | { ok: false; reason: "locked" | "invalid" | "no_2fa" };

type TwoFactorUser = {
  id: string;
  totpEnabled: boolean;
  totpSecretEnc: string | null;
  twoFactorFailedCount: number;
  twoFactorLockedUntil: Date | null;
};

// Verify a TOTP code OR a one-time backup code for a user with 2FA enabled.
// - Locked window → { ok:false, reason:"locked" } (no code is even checked).
// - Valid TOTP or unused backup code → consume/reset counters, { ok:true }.
// - Otherwise → increment the failure counter (locking at the threshold).
// The caller (authorize) must already have verified the password.
export async function verifyTwoFactor(
  user: TwoFactorUser,
  rawCode: string,
): Promise<TwoFactorResult> {
  if (!user.totpEnabled || !user.totpSecretEnc) return { ok: false, reason: "no_2fa" };

  const now = Date.now();
  if (user.twoFactorLockedUntil && user.twoFactorLockedUntil.getTime() > now) {
    return { ok: false, reason: "locked" };
  }

  const code = rawCode.trim();
  if (!code) return recordFailure(user);

  // 1) TOTP (±1 step window).
  let secret: string;
  try {
    secret = decryptSecret(user.totpSecretEnc);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (verifyTotp(secret, code)) {
    await resetFailures(user.id);
    return { ok: true };
  }

  // 2) Backup code — one-time. Compare against each unused hash; on a match,
  // mark it used atomically (and only succeed if THIS request claimed it).
  const normalized = normalizeBackupCode(code);
  if (normalized.length > 0) {
    const unused = await db.query.twoFactorBackupCodes.findMany({
      where: and(eq(twoFactorBackupCodes.userId, user.id), isNull(twoFactorBackupCodes.usedAt)),
    });
    for (const row of unused) {
      if (await bcrypt.compare(normalized, row.codeHash)) {
        const claimed = await db
          .update(twoFactorBackupCodes)
          .set({ usedAt: new Date() })
          .where(and(eq(twoFactorBackupCodes.id, row.id), isNull(twoFactorBackupCodes.usedAt)))
          .returning({ id: twoFactorBackupCodes.id });
        if (claimed.length === 1) {
          await resetFailures(user.id);
          return { ok: true };
        }
      }
    }
  }

  return recordFailure(user);
}

async function recordFailure(user: TwoFactorUser): Promise<TwoFactorResult> {
  const nextCount = user.twoFactorFailedCount + 1;
  const lock = nextCount >= MAX_FAILURES;
  await db
    .update(users)
    .set({
      twoFactorFailedCount: lock ? 0 : nextCount,
      twoFactorLockedUntil: lock ? new Date(Date.now() + LOCK_MS) : user.twoFactorLockedUntil,
    })
    .where(eq(users.id, user.id));
  return { ok: false, reason: lock ? "locked" : "invalid" };
}

async function resetFailures(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ twoFactorFailedCount: 0, twoFactorLockedUntil: null })
    .where(eq(users.id, userId));
}
