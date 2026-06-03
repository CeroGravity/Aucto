import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import { env } from "@/lib/env";
import type { StorageProvider, StoredFile } from "./types";

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

function uploadDir(): string {
  const dir = env.LOCAL_UPLOAD_DIR;
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

// Disk-backed storage. Keys are `<random>.<ext>`; filenames are random (never
// derived from the client filename). Resolved paths are confined to the upload
// dir to prevent traversal via a crafted key.
export class LocalStorageProvider implements StorageProvider {
  async put(file: StoredFile): Promise<string> {
    const ext = EXT_BY_TYPE[file.contentType];
    if (!ext) throw new Error(`Unsupported content type: ${file.contentType}`);
    const key = `${randomBytes(16).toString("hex")}.${ext}`;
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, key), file.bytes);
    return key;
  }

  async get(key: string): Promise<StoredFile | null> {
    // Reject anything that isn't a bare `<hex>.<ext>` (no slashes / traversal).
    const match = /^[a-f0-9]{32}\.(jpg|png|webp)$/.exec(key);
    if (!match) return null;
    const ext = match[1] as keyof typeof TYPE_BY_EXT;
    try {
      const bytes = await readFile(join(uploadDir(), key));
      return { bytes, contentType: TYPE_BY_EXT[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
}
