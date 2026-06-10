import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

// AES-256-GCM encryption for the TOTP secret at rest. The key is DERIVED from
// AUTH_SECRET via HKDF-SHA256 (a dedicated info label, so it's independent of
// any other AUTH_SECRET use) — there is NO new env var, and the plaintext secret
// never touches the database.
const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // GCM standard nonce length
const HKDF_INFO = "aucto:2fa:totp-secret:v1";

function key(): Buffer {
  // HKDF with an empty salt is fine here: AUTH_SECRET is already high-entropy and
  // the info label domain-separates this key from other derivations.
  const derived = hkdfSync("sha256", env.AUTH_SECRET, new Uint8Array(0), HKDF_INFO, KEY_LEN);
  return Buffer.from(derived);
}

// Returns "iv.tag.ciphertext", each segment base64url. Self-describing so
// decrypt needs no external metadata.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed 2FA secret.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
