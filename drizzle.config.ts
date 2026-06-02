import { defineConfig } from "drizzle-kit";

// Load .env.local for standalone drizzle-kit invocations (Next loads it
// automatically, but the CLI does not). Built into Node — no dotenv dep.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may be absent in CI; fall back to ambient env.
}

// DDL/migrations must use the direct (non-pooled) Neon endpoint. Prefer an
// explicit DATABASE_URL_UNPOOLED; otherwise derive it from the pooled URL by
// dropping the "-pooler" host segment.
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL?.replace("-pooler", "");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
