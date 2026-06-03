import { describe, expect, it } from "vitest";

import { isPrivateKey, isPublicKey } from "@/lib/storage";

const HEX = "0123456789abcdef0123456789abcdef"; // 32 hex chars
const pub = `pub_${HEX}.jpg`;
const prv = `prv_${HEX}.png`;
const legacy = `${HEX}.webp`; // 5c screenshots (bare)

describe("storage key namespace confinement", () => {
  it("a public key validates only as public", () => {
    expect(isPublicKey(pub)).toBe(true);
    expect(isPrivateKey(pub)).toBe(false);
  });

  it("a private key validates only as private", () => {
    expect(isPrivateKey(prv)).toBe(true);
    expect(isPublicKey(prv)).toBe(false);
  });

  it("legacy bare screenshot keys are private, never public", () => {
    expect(isPrivateKey(legacy)).toBe(true);
    expect(isPublicKey(legacy)).toBe(false);
  });

  it("rejects traversal / malformed keys on both validators", () => {
    for (const bad of [
      "pub_../../etc/passwd",
      "pub_/nested/key.jpg",
      `pub_${HEX}.gif`,
      "pub_short.jpg",
      `prv_${HEX}`,
      "",
    ]) {
      expect(isPublicKey(bad)).toBe(false);
      expect(isPrivateKey(bad)).toBe(false);
    }
  });
});
