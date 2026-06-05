import { z } from "zod";

const envSchema = z
  .object({
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
    // Notifications. "fake" (default) logs + captures, no network. "real" uses
    // Telegram (owner alert) + Resend (customer receipt) when configured.
    // "throw" is a test-only mode (a notifier that always throws) to prove
    // notifications are non-blocking; never set in prod.
    NOTIFY_PROVIDER: z.enum(["fake", "real", "throw"]).default("fake"),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHAT_ID: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Provider-gated production requirements: a provider is only valid if its
    // credentials are present. This fails the build/boot with a clear message.
    if (env.STORAGE_PROVIDER === "blob" && !env.BLOB_READ_WRITE_TOKEN) {
      ctx.addIssue({
        code: "custom",
        path: ["BLOB_READ_WRITE_TOKEN"],
        message: "BLOB_READ_WRITE_TOKEN is required when STORAGE_PROVIDER=blob.",
      });
    }
    if (env.NOTIFY_PROVIDER === "real") {
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
        ctx.addIssue({
          code: "custom",
          path: ["TELEGRAM_BOT_TOKEN"],
          message:
            "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required when NOTIFY_PROVIDER=real.",
        });
      }
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
        ctx.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY and EMAIL_FROM are required when NOTIFY_PROVIDER=real.",
        });
      }
    }
    if (env.PAYMENT_PROVIDER === "sslcommerz" && (!env.SSLCZ_STORE_ID || !env.SSLCZ_STORE_PASSWD)) {
      ctx.addIssue({
        code: "custom",
        path: ["SSLCZ_STORE_ID"],
        message:
          "SSLCZ_STORE_ID and SSLCZ_STORE_PASSWD are required when PAYMENT_PROVIDER=sslcommerz.",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables.");
}

export const env = parsed.data;
