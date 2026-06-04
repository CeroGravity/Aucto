// Grant admin role to a user by email. Run once for the owner:
//   pnpm grant-admin owner@example.com
// Uses the direct/unpooled connection (like seed).
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/lib/db/schema";

// Skip .env.local under the local test DB (TEST_DATABASE_URL set by
// scripts/with-test-db.ts) so e2e grants land on the test DB, never Neon.
if (!process.env.TEST_DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fall back to ambient env
  }
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: pnpm grant-admin <email>");
  process.exit(1);
}

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL?.replace("-pooler", "");
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql, { schema });

const updated = await db
  .update(schema.users)
  .set({ role: "admin" })
  .where(eq(schema.users.email, email))
  .returning({ id: schema.users.id, email: schema.users.email });

if (updated.length === 0) {
  console.error(`No user found with email: ${email}`);
  await sql.end();
  process.exit(1);
}

console.log(`Granted admin to ${email}.`);
await sql.end();
