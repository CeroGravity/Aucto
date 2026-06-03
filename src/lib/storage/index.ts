import { env } from "@/lib/env";
import { BlobStorageProvider } from "./blob";
import { LocalStorageProvider } from "./local";
import type { StorageProvider } from "./types";

// Active storage provider by env (STORAGE_PROVIDER=local default | blob).
export const storageProvider: StorageProvider =
  env.STORAGE_PROVIDER === "blob" ? new BlobStorageProvider() : new LocalStorageProvider();

export { isPrivateKey, isPublicKey } from "./keys";
export type { StorageProvider, StoredFile, Visibility } from "./types";
