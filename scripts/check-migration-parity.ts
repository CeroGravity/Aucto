// Verify the generated migrations reproduce the schema EXACTLY: apply the
// migrations to one fresh DB and `drizzle-kit push` the schema to another, then
// compare a normalized schema snapshot (tables, columns, types, nullability,
// enums, constraints) — identical snapshots prove the migration matches the
// schema source. (We compare snapshots rather than `drizzle-kit push`'s own diff
// output, which reports cosmetic *_not_null pseudo-constraint churn that isn't
// real drift.) Boots its own embedded Postgres so it never touches the dev DB.

import { execFileSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { embeddedPgLibDir, ldPathReady, withEmbeddedPgEnv } from "../tests/db/embedded";

const PORT = 54331;
const DATA_DIR = ".tmp/migparity-pgdata";
const MIG_DB = "aucto_mig";
const PUSH_DB = "aucto_push";
const base = `postgres://postgres:postgres@localhost:${PORT}`;

if (!ldPathReady()) {
  const child = spawn("pnpm", ["exec", "tsx", "scripts/check-migration-parity.ts"], {
    stdio: "inherit",
    env: withEmbeddedPgEnv(),
  });
  child.on("exit", (code) => process.exit(code ?? 1));
} else {
  void main();
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync(cmd, args, { env, encoding: "utf8", stdio: "pipe" });
}

// A deterministic, normalized snapshot of the public schema.
async function snapshot(url: string): Promise<string> {
  const sql = postgres(url, { max: 1 });
  try {
    const columns = await sql`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`;
    const constraints = await sql`
      SELECT tc.table_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type, kcu.column_name`;
    const enums = await sql`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      ORDER BY t.typname, e.enumsortorder`;
    return JSON.stringify(
      {
        columns: columns.map((c) => ({ ...c })),
        constraints: constraints.map((c) => ({ ...c })),
        enums: enums.map((e) => ({ ...e })),
      },
      null,
      2,
    );
  } finally {
    await sql.end();
  }
}

async function main(): Promise<void> {
  embeddedPgLibDir();
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  for (const db of [MIG_DB, PUSH_DB]) {
    try {
      await pg.createDatabase(db);
    } catch {
      // already exists
    }
  }

  let code = 0;
  try {
    const migUrl = `${base}/${MIG_DB}`;
    const pushUrl = `${base}/${PUSH_DB}`;

    console.log("[migparity] applying migrations → mig DB…");
    run("pnpm", ["exec", "tsx", "scripts/migrate.ts"], {
      ...process.env,
      TEST_DATABASE_URL: migUrl,
    });

    console.log("[migparity] pushing schema → push DB…");
    run("pnpm", ["exec", "drizzle-kit", "push", "--force"], {
      ...process.env,
      TEST_DATABASE_URL: pushUrl,
    });

    const [migSnap, pushSnap] = await Promise.all([snapshot(migUrl), snapshot(pushUrl)]);
    if (migSnap === pushSnap) {
      console.log("[migparity] PASS — migrated schema is identical to the push schema.");
    } else {
      console.error("[migparity] FAIL — schemas differ:");
      const a = migSnap.split("\n");
      const b = pushSnap.split("\n");
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) console.error(`  mig:  ${a[i] ?? "∅"}\n  push: ${b[i] ?? "∅"}`);
      }
      code = 1;
    }
  } catch (error) {
    console.error("[migparity] error:", error instanceof Error ? error.message : error);
    code = 1;
  } finally {
    await pg.stop().catch(() => {});
    await sleep(100);
  }
  process.exit(code);
}
