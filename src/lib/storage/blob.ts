import type { StorageProvider, StoredFile } from "./types";

// Deploy stub. Wire to @vercel/blob (or similar) using env.BLOB_READ_WRITE_TOKEN
// when deploying; the local adapter covers dev + tests until then.
export class BlobStorageProvider implements StorageProvider {
  async put(_file: StoredFile): Promise<string> {
    throw new Error("BlobStorageProvider is not implemented yet (deploy phase).");
  }

  async get(_key: string): Promise<StoredFile | null> {
    throw new Error("BlobStorageProvider is not implemented yet (deploy phase).");
  }
}
