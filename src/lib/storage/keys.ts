import type { Visibility } from "./types";

// Storage keys are `<prefix><32-hex>.<ext>`. The prefix encodes visibility, so
// a public key and a private key are structurally distinct — the public route
// only accepts `pub_…` and the private (admin) route only accepts `prv_…` (plus
// legacy bare `<32hex>.<ext>` screenshots from 5c). Neither can serve the
// other's namespace.
export const PREFIX: Record<Visibility, string> = {
  public: "pub_",
  private: "prv_",
};

const EXT = "(jpg|png|webp)";
const PUBLIC_KEY_RE = new RegExp(`^pub_[a-f0-9]{32}\\.${EXT}$`);
// Private accepts the new prv_ namespace AND legacy bare keys (5c screenshots).
const PRIVATE_KEY_RE = new RegExp(`^(prv_)?[a-f0-9]{32}\\.${EXT}$`);
// Any key the local adapter knows how to read (used for path-confinement).
const ANY_KEY_RE = new RegExp(`^(pub_|prv_)?[a-f0-9]{32}\\.${EXT}$`);

export function isPublicKey(key: string): boolean {
  return PUBLIC_KEY_RE.test(key);
}

export function isPrivateKey(key: string): boolean {
  // A pub_ key must never validate as private.
  return !key.startsWith("pub_") && PRIVATE_KEY_RE.test(key);
}

export function isKnownKey(key: string): boolean {
  return ANY_KEY_RE.test(key);
}

export function extOf(key: string): "jpg" | "png" | "webp" | null {
  const m = ANY_KEY_RE.exec(key);
  return (m?.[2] as "jpg" | "png" | "webp" | undefined) ?? null;
}
