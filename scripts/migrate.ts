// Apply versioned SQL migrations (drizzle/) to the database. PRODUCTION uses
// this (db:migrate) instead of db:push. Runs on the direct/unpooled endpoint —
// DDL can't go through the pooler. Dev/CI may keep db:push.
//   pnpm db:migrate

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Skip .env.local under the local test DB (TEST_DATABASE_URL set by
// scripts/with-test-db.ts) so the Neon prod URL can't clobber it.
if (!process.env.TEST_DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // .env.local may be absent in CI; fall back to ambient env.
  }
}

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL?.replace("-pooler", "");
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

migrate(db, { migrationsFolder: "./drizzle" })
  .then(async () => {
    console.log("Migrations applied.");
    await client.end();
  })
  .catch(async (error) => {
    console.error("Migration failed:", error);
    await client.end();
    process.exit(1);
  });
