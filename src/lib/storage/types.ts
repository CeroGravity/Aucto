// Storage abstraction for uploaded files.
// PUBLIC  = product images, served unauthenticated via /api/images/[key].
// PRIVATE = payment screenshots, served only via the admin-gated route.
// Keys are namespaced by visibility (pub_ / prv_ prefix) so neither route can
// ever serve the other's assets.

export type Visibility = "public" | "private";

export type StoredFile = {
  bytes: Buffer;
  contentType: string;
};

export interface StorageProvider {
  /** Persist bytes, returning an opaque namespaced key (never a public URL). */
  put(file: StoredFile, visibility: Visibility): Promise<string>;
  /** Read bytes back by key. */
  get(key: string): Promise<StoredFile | null>;
}
