// Load .env.local so unit tests that touch env-validated modules (db, auth)
// and the real DB have their configuration.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Fall back to ambient env (CI).
}
