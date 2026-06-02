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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables.");
}

export const env = parsed.data;
