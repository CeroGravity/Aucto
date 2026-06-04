// Orchestrator: boot the local embedded Postgres, apply the schema, seed it,
// run a child command (vitest / playwright) against it, then tear it down.
//
// Usage: tsx scripts/with-test-db.ts -- <command> [args...]
// The child inherits TEST_DATABASE_URL + DATABASE_URL (both → the local DB) and
// LD_LIBRARY_PATH so any spawned node (e.g. Playwright's `pnpm start`) can load
// the bundled Postgres libs.
//
// `--reset` (env RESET_TEST_DB=1) drops the on-disk cluster first for a fully
// clean init; otherwise an existing cluster is reused and just reseeded.

import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import {
  ldPathReady,
  startEmbeddedPg,
  TEST_DATABASE_URL,
  TEST_DB_DIR,
  withEmbeddedPgEnv,
} from "../tests/db/embedded";

// The embedded Postgres binary (spawned as our child) resolves its bundled libs
// via LD_LIBRARY_PATH, which the dynamic loader reads at PROCESS START. So if
// it's not yet set, re-exec THIS script once (via tsx, to keep TS support) with
// the lib dir prepended, then proceed in the child.
if (!ldPathReady()) {
  const child = spawn(
    "pnpm",
    ["exec", "tsx", "scripts/with-test-db.ts", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: withEmbeddedPgEnv(),
    },
  );
  child.on("exit", (code) => process.exit(code ?? 1));
  child.on("error", (err) => {
    console.error("[test-db] re-exec failed:", err);
    process.exit(1);
  });
} else {
  void runMain();
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function runMain(): Promise<void> {
  const code = await main().catch((error) => {
    console.error("[test-db] fatal:", error);
    return 1;
  });
  process.exit(code);
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const sep = argv.indexOf("--");
  const childArgv = sep >= 0 ? argv.slice(sep + 1) : argv;
  const [childCmd, ...childArgs] = childArgv;
  if (!childCmd) {
    console.error("Usage: tsx scripts/with-test-db.ts -- <command> [args...]");
    return 1;
  }

  if (process.env.RESET_TEST_DB === "1" || argv.includes("--reset")) {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }

  // The child env: point BOTH the app (DATABASE_URL) and tooling at the local
  // DB, and never let a stray .env.local Neon URL leak in.
  const childEnv = withEmbeddedPgEnv({
    ...process.env,
    TEST_DATABASE_URL,
    DATABASE_URL: TEST_DATABASE_URL,
    DATABASE_URL_UNPOOLED: TEST_DATABASE_URL,
    // Deterministic, credential-free test runtime.
    NODE_ENV: process.env.NODE_ENV ?? "test",
    AUTH_SECRET: process.env.AUTH_SECRET ?? "test-secret-not-for-prod",
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER ?? "fake",
    NOTIFY_PROVIDER: process.env.NOTIFY_PROVIDER ?? "fake",
  });

  console.log("[test-db] starting embedded Postgres…");
  const pg = await startEmbeddedPg();

  let code = 1;
  try {
    console.log("[test-db] applying schema (drizzle-kit push)…");
    code = await run("pnpm", ["exec", "drizzle-kit", "push", "--force"], childEnv);
    if (code !== 0) return code;

    console.log("[test-db] seeding…");
    code = await run("pnpm", ["exec", "tsx", "scripts/seed.ts"], childEnv);
    if (code !== 0) return code;

    console.log(`[test-db] running: ${childArgv.join(" ")}`);
    code = await run(childCmd, childArgs, childEnv);
  } finally {
    console.log("[test-db] stopping embedded Postgres…");
    await pg.stop().catch(() => {});
  }
  return code;
}
