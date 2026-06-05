import { randomBytes } from "node:crypto";
import { head, put } from "@vercel/blob";

import { env } from "@/lib/env";
import { extOf, isKnownKey, PREFIX } from "./keys";
import type { StorageProvider, StoredFile, Visibility } from "./types";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Vercel Blob adapter (prod). The pub_/prv_ namespaced key IS the blob pathname
// (deterministic, no random suffix), so get() can resolve a key back to its blob
// without storing the URL in the DB.
//
// PUBLIC product images: served via the public route (and could use the public
// blob URL + next/image remotePatterns). PRIVATE payment screenshots: although
// every Vercel blob has a public (unguessable) URL, that URL is NEVER sent to
// the client — the admin-gated route fetches the bytes server-side (with the
// token) and streams them, so privacy is preserved exactly as with the local
// adapter. The pub_/prv_ namespace + the route gates are the access control.
export class BlobStorageProvider implements StorageProvider {
  private token(): string {
    const token = env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is required when STORAGE_PROVIDER=blob.");
    }
    return token;
  }

  async put(file: StoredFile, visibility: Visibility): Promise<string> {
    const ext = EXT_BY_TYPE[file.contentType];
    if (!ext) throw new Error(`Unsupported content type: ${file.contentType}`);
    const key = `${PREFIX[visibility]}${randomBytes(16).toString("hex")}.${ext}`;
    await put(key, file.bytes, {
      access: "public",
      addRandomSuffix: false, // pathname === key, so get() can resolve it
      contentType: file.contentType,
      token: this.token(),
    });
    return key;
  }

  async get(key: string): Promise<StoredFile | null> {
    if (!isKnownKey(key)) return null; // confine to the key namespace
    const ext = extOf(key);
    if (!ext) return null;
    try {
      // Resolve the key → blob URL server-side (with the token); the URL is
      // never returned to callers — only the bytes are.
      const meta = await head(key, { token: this.token() });
      const res = await fetch(meta.url);
      if (!res.ok) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      return {
        bytes,
        contentType: meta.contentType ?? TYPE_BY_EXT[ext] ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
}
