import { z } from "zod";

const envSchema = z.object({
  // Pooled Neon connection (PgBouncer) for the app runtime.
  DATABASE_URL: z.url(),
  // Direct (non-pooled) Neon connection for migrations/seed/DDL. Optional —
  // tooling derives it from DATABASE_URL when unset.
  DATABASE_URL_UNPOOLED: z.url().optional(),
  // Auth.js session/JWT secret.
  AUTH_SECRET: z.string().min(1),
  // Payment provider selection + SSLCommerz sandbox credentials (optional;
  // app runs on the fake adapter without them).
  PAYMENT_PROVIDER: z.enum(["fake", "sslcommerz"]).default("fake"),
  SSLCZ_STORE_ID: z.string().optional(),
  SSLCZ_STORE_PASSWD: z.string().optional(),
  SSLCZ_IS_LIVE: z.enum(["true", "false"]).default("false"),
  // Absolute base URL for building payment callback URLs.
  APP_URL: z.url().default("http://localhost:3000"),
  // Storage for uploaded payment screenshots.
  STORAGE_PROVIDER: z.enum(["local", "blob"]).default("local"),
  LOCAL_UPLOAD_DIR: z.string().default("./uploads"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Public merchant numbers + contact (sent to the client; not secrets).
  NEXT_PUBLIC_BKASH_NUMBER: z.string().default(""),
  NEXT_PUBLIC_NAGAD_NUMBER: z.string().default(""),
  NEXT_PUBLIC_FACEBOOK_URL: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables.");
}

export const env = parsed.data;
