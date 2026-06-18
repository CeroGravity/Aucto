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
    // Google OAuth (optional). The Node auth config registers Google only when
    // its pair is present, so dev/CI without creds still boots and the
    // Credentials path is unaffected.
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
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
    // Vercel Blob store id (e.g. store_xxx). On Vercel this pairs with the
    // auto-rotated VERCEL_OIDC_TOKEN so server-side put()/head() authenticate via
    // OIDC — no static secret. Required when STORAGE_PROVIDER=blob.
    BLOB_STORE_ID: z.string().optional(),
    // Optional fallback static token for non-Vercel/CLI contexts (where there is
    // no OIDC token). When unset on Vercel, the SDK uses OIDC + BLOB_STORE_ID.
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    // Public base URL of the Blob store (e.g. https://<id>.public.blob.vercel-storage.com).
    // When set (prod + STORAGE_PROVIDER=blob), public product images are served
    // straight from Blob's CDN via next/image instead of proxying through the
    // app's /api/images route. Public — it's the storefront image host.
    NEXT_PUBLIC_BLOB_BASE_URL: z.string().default(""),
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
    if (env.STORAGE_PROVIDER === "blob") {
      // OIDC auth: the store id identifies the Blob store; VERCEL_OIDC_TOKEN
      // (auto-injected on Vercel) authenticates. A static token is optional.
      if (!env.BLOB_STORE_ID) {
        ctx.addIssue({
          code: "custom",
          path: ["BLOB_STORE_ID"],
          message: "BLOB_STORE_ID is required when STORAGE_PROVIDER=blob.",
        });
      }
      if (!env.NEXT_PUBLIC_BLOB_BASE_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_BLOB_BASE_URL"],
          message: "NEXT_PUBLIC_BLOB_BASE_URL is required when STORAGE_PROVIDER=blob.",
        });
      }
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
