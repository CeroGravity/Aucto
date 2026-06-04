// Local, ephemeral Postgres for the test suite — no Docker, no system install.
//
// embedded-postgres ships a real Postgres binary (under
// @embedded-postgres/<platform>/native). The binary links against bundled
// shared libs (libpq, libicu, …) whose major-version SONAMEs are created by the
// package's `hydrate-symlinks` build step and resolved at launch via
// LD_LIBRARY_PATH. Because the dynamic loader reads LD_LIBRARY_PATH at process
// start (before our JS runs), callers must set it before spawning node — see
// `withEmbeddedPgEnv()` and the `test:db:*` scripts.

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const require = createRequire(import.meta.url);

export const TEST_DB_PORT = 54329;
export const TEST_DB_NAME = "aucto_test";
export const TEST_DATABASE_URL = `postgres://postgres:postgres@localhost:${TEST_DB_PORT}/${TEST_DB_NAME}`;

// Stable on-disk cluster dir so a run can reuse an already-initialised cluster.
export const TEST_DB_DIR = join(process.cwd(), ".tmp", "test-pgdata");

// Locate the bundled native/lib dir for the current platform package. The
// package blocks `exports` of package.json, so resolve its main entry
// (…/<pkg>/dist/index.js) and walk to the sibling native/lib.
export function embeddedPgLibDir(): string {
  const pkg = `@embedded-postgres/${process.platform}-${process.arch === "x64" ? "x64" : process.arch}`;
  const main = require.resolve(pkg); // …/<pkg>/dist/index.js
  const pkgRoot = dirname(dirname(main)); // …/<pkg>
  return join(pkgRoot, "native", "lib");
}

// True once LD_LIBRARY_PATH already includes the bundled lib dir.
export function ldPathReady(): boolean {
  const lib = embeddedPgLibDir();
  return (process.env.LD_LIBRARY_PATH ?? "").split(":").includes(lib);
}

// The env a child node process needs so the embedded binary can load its libs.
export function withEmbeddedPgEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const lib = embeddedPgLibDir();
  const existing = env.LD_LIBRARY_PATH ?? "";
  const next = existing.split(":").includes(lib) ? existing : existing ? `${lib}:${existing}` : lib;
  return { ...env, LD_LIBRARY_PATH: next };
}

export function createEmbeddedPg(): EmbeddedPostgres {
  return new EmbeddedPostgres({
    databaseDir: TEST_DB_DIR,
    user: "postgres",
    password: "postgres",
    port: TEST_DB_PORT,
    persistent: false,
  });
}

// Start a fresh cluster (initialise if absent), ensure the test DB exists.
// Returns the running handle; the caller is responsible for `.stop()`.
export async function startEmbeddedPg(): Promise<EmbeddedPostgres> {
  if (!ldPathReady()) {
    throw new Error(
      "LD_LIBRARY_PATH is missing the embedded-postgres lib dir. Launch via the " +
        "test:db scripts (they prepend it), or call withEmbeddedPgEnv().",
    );
  }
  const pg = createEmbeddedPg();
  const initialised = existsSync(join(TEST_DB_DIR, "PG_VERSION"));
  if (!initialised) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(TEST_DB_NAME);
  } catch {
    // Already exists from a previous run — fine.
  }
  return pg;
}
