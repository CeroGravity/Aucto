// Idempotent seed CLI: clear-and-reseed in one transaction. Re-running yields
// identical row counts (no duplicates). Run via `pnpm db:seed`.
// The seed data + logic live in src/lib/db/seed-data.ts (shared with the e2e
// per-test reseed fixture).

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { seedDatabase } from "../src/lib/db/seed-data";

// Skip .env.local when running against the local test DB (TEST_DATABASE_URL is
// set by scripts/with-test-db.ts) so the Neon prod URL can't clobber it.
if (!process.env.TEST_DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // .env.local may be absent in CI; fall back to ambient env.
  }
}

// Seed/DDL uses the direct (non-pooled) endpoint — the pooler rejects the
// prepared statements postgres-js issues by default. The local test DB is set
// via TEST_DATABASE_URL and has no pooler segment.
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL?.replace("-pooler", "");
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

seedDatabase(db)
  .then(async (counts) => {
    console.log("Seed complete. Row counts:");
    console.log(
      `  categories=${counts.categories} products=${counts.products} variants=${counts.variants} images=${counts.images}`,
    );
    await client.end();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await client.end();
    process.exit(1);
  });
