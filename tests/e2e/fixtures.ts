// Deterministic e2e isolation: reseed the local test DB before EVERY test so
// each starts from the known seed state — no stock depletion or order/state
// bleed across tests in the (serial) run. This is what lets retries stay OFF.
//
// All specs import { test, expect } from this module instead of
// "@playwright/test". One DB client is opened per worker process and reused by
// an auto beforeEach.

import { expect, test } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/lib/db/schema";
import { seedDatabase } from "../../src/lib/db/seed-data";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set — run e2e via `pnpm test:e2e` (scripts/with-test-db.ts).",
  );
}

// One client per worker process; lazily created, closed on process exit.
const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client, { schema });
process.once("exit", () => {
  void client.end();
});

test.beforeEach(async () => {
  await seedDatabase(db);
});

export { expect, test };
