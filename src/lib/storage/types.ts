// Storage abstraction for uploaded files (payment screenshots). The local-disk
// adapter is the default; a blob adapter is stubbed for deploy.

export type StoredFile = {
  bytes: Buffer;
  contentType: string;
};

export interface StorageProvider {
  /** Persist bytes, returning an opaque key (never a public URL). */
  put(file: StoredFile): Promise<string>;
  /** Read bytes back by key (for the role-gated retrieval route). */
  get(key: string): Promise<StoredFile | null>;
}
