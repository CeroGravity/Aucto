// When the suite runs against the local embedded Postgres (via
// scripts/with-test-db.ts), TEST_DATABASE_URL is set and DATABASE_URL already
// points at it — do NOT load .env.local, or the Neon prod URL would clobber it.
// Otherwise (ad-hoc `vitest run`), load .env.local so env-validated modules
// (db, auth) have their configuration.
if (!process.env.TEST_DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall back to ambient env (CI).
  }
}
