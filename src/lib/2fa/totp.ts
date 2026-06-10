import { randomBytes, randomInt } from "node:crypto";

import * as OTPAuth from "otpauth";

const ISSUER = "Aucto";

// otpauth's Secret.fromBase32 / .base32 keep us on a maintained, zero-dep TOTP
// implementation. Defaults: SHA1, 6 digits, 30s period — the authenticator-app
// standard (Google Authenticator, Authy, 1Password, …).
function totp(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

// A fresh random base32 secret (160-bit) for enrollment.
export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

// otpauth:// provisioning URI for the QR code + manual entry.
export function totpAuthUri(secretBase32: string, accountLabel: string): string {
  return totp(secretBase32, accountLabel).toString();
}

// Verify a 6-digit code with a ±1 step window (tolerates minor clock drift).
// Returns true on match. `window: 1` checks the prev/current/next 30s steps.
export function verifyTotp(secretBase32: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const delta = totp(secretBase32, ISSUER).validate({ token: normalized, window: 1 });
  return delta !== null;
}

// Backup codes: 10 human-friendly one-time codes (e.g. "a1b2-c3d4"). Returned in
// plaintext ONCE to show the user; the caller hashes them for storage.
export function generateBackupCodes(count = 10): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  const pick = () => alphabet[randomInt(alphabet.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return Array.from({ length: count }, () => `${block()}-${block()}`);
}

// Normalize a backup code for comparison (case-insensitive, dashes/space-free).
export function normalizeBackupCode(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Re-export for tests/utilities that need raw entropy without otpauth.
export { randomBytes };
