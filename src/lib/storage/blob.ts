import type { StorageProvider, StoredFile, Visibility } from "./types";

// Deploy stub. Wire to @vercel/blob (or similar) using env.BLOB_READ_WRITE_TOKEN
// at deploy. Public assets get a public blob URL; private (screenshots) stay
// access-controlled. The local adapter covers dev + tests until then.
export class BlobStorageProvider implements StorageProvider {
  async put(_file: StoredFile, _visibility: Visibility): Promise<string> {
    throw new Error("BlobStorageProvider is not implemented yet (deploy phase).");
  }

  async get(_key: string): Promise<StoredFile | null> {
    throw new Error("BlobStorageProvider is not implemented yet (deploy phase).");
  }
}
