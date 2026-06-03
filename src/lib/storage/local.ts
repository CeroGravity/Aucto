import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

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

function uploadDir(): string {
  const dir = env.LOCAL_UPLOAD_DIR;
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

// Disk-backed storage. Keys are `<prefix><random-hex>.<ext>`; filenames are
// random (never derived from the client filename) and namespaced by visibility.
// get() only resolves keys matching the strict pattern (no slashes / traversal).
export class LocalStorageProvider implements StorageProvider {
  async put(file: StoredFile, visibility: Visibility): Promise<string> {
    const ext = EXT_BY_TYPE[file.contentType];
    if (!ext) throw new Error(`Unsupported content type: ${file.contentType}`);
    const key = `${PREFIX[visibility]}${randomBytes(16).toString("hex")}.${ext}`;
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, key), file.bytes);
    return key;
  }

  async get(key: string): Promise<StoredFile | null> {
    if (!isKnownKey(key)) return null; // confine to the key namespace
    const ext = extOf(key);
    if (!ext) return null;
    try {
      const bytes = await readFile(join(uploadDir(), key));
      return {
        bytes,
        contentType: TYPE_BY_EXT[ext] ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
}
