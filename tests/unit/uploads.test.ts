import { describe, expect, it } from "vitest";

import { validateImageUpload } from "@/lib/uploads";

function fileOf(bytes: number[] | Buffer, name = "x", type = "image/png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0];

describe("validateImageUpload", () => {
  it("accepts a PNG by magic bytes", async () => {
    const r = await validateImageUpload(fileOf(PNG));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.image.contentType).toBe("image/png");
  });

  it("accepts a JPEG by magic bytes", async () => {
    const r = await validateImageUpload(fileOf(JPEG, "x", "image/jpeg"));
    expect(r.ok).toBe(true);
  });

  it("rejects a non-image even if the client lies about the type", async () => {
    // Text bytes but claims image/png — magic-byte sniff must reject.
    const r = await validateImageUpload(fileOf([0x68, 0x69, 0x21], "x", "image/png"));
    expect(r.ok).toBe(false);
  });

  it("rejects an oversized file", async () => {
    const big = Buffer.concat([Buffer.from(PNG), Buffer.alloc(6 * 1024 * 1024)]);
    const r = await validateImageUpload(fileOf(big));
    expect(r.ok).toBe(false);
  });

  it("rejects a missing/empty upload", async () => {
    expect((await validateImageUpload(null)).ok).toBe(false);
    expect((await validateImageUpload(fileOf([]))).ok).toBe(false);
  });
});
