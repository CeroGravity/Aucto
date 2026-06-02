// Connectivity check: opens a pooled connection and runs `SELECT 1`.
// Run via `pnpm db:check`. Exits non-zero on failure so CI fails loudly.

import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may be absent; fall back to ambient env.
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL?.replace("-pooler", "");

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });

try {
  const rows = await sql`SELECT 1 AS ok`;
  if (rows[0]?.ok === 1) {
    console.log("db:check OK — SELECT 1 succeeded.");
  } else {
    console.error("db:check FAILED — unexpected result:", rows);
    process.exit(1);
  }
} catch (error) {
  console.error("db:check FAILED — could not connect:", error);
  process.exit(1);
} finally {
  await sql.end();
}
