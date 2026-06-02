import { z } from "zod";

const envSchema = z.object({
  // Pooled Neon connection (PgBouncer) for the app runtime.
  DATABASE_URL: z.url(),
  // Direct (non-pooled) Neon connection for migrations/seed/DDL. Optional —
  // tooling derives it from DATABASE_URL when unset.
  DATABASE_URL_UNPOOLED: z.url().optional(),
  // Auth.js session/JWT secret.
  AUTH_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables.");
}

export const env = parsed.data;
