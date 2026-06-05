# AUCTO

Next.js 15 + TypeScript storefront. See `.claude/CLAUDE.md` for stack and conventions.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, …
pnpm db:push                 # apply schema to your dev DB (dev/CI may keep push)
pnpm db:seed                 # seed catalog
pnpm dev
```

### Schema management

- **Dev/CI:** `pnpm db:push` (fast, no migration files).
- **Production:** versioned migrations. `pnpm db:generate` emits SQL into `drizzle/`
  from the schema; `pnpm db:migrate` applies them (direct/unpooled connection).
  The generated migrations reproduce the schema exactly — verify with
  `pnpm exec tsx scripts/check-migration-parity.ts` (migrated schema == push schema).

### Storage & env

- `STORAGE_PROVIDER=local` (default) writes uploads to disk for dev/CI;
  `STORAGE_PROVIDER=blob` + `BLOB_READ_WRITE_TOKEN` uses Vercel Blob in prod.
  Private payment screenshots are always served through the admin-gated route —
  the blob URL is never sent to the client.
- `src/lib/env.ts` fails the build/boot with a clear message if a provider is
  enabled without its required vars (blob → token; notify=real → Telegram +
  Resend keys).

## Testing

Tests run against a **local, ephemeral Postgres** — never the Neon prod/dev DB.
No Docker, no system Postgres install, no sudo: `embedded-postgres` ships a real
Postgres binary that the test runner boots on `localhost:54329`, applies the
schema to, and seeds, before running the suite.

```bash
pnpm test         # unit (Vitest) against the local test DB
pnpm test:e2e     # e2e (Playwright) against the local test DB
pnpm test:db:setup  # just boot + schema + seed the local test DB (smoke check)
```

Both wrap `scripts/with-test-db.ts`, which:

1. Boots the embedded Postgres (re-exec'ing once with `LD_LIBRARY_PATH` set to
   the bundled libs the binary needs).
2. Sets `TEST_DATABASE_URL` and points `DATABASE_URL` (app + tooling) at it.
3. Applies the schema (`drizzle-kit push`) and seeds.
4. Runs the child test command, then stops Postgres.

Determinism:

- **Per-test reseed** (`tests/e2e/fixtures.ts`) resets the DB to the seed state
  before every e2e test — no stock depletion or order/state bleed across tests.
- **Retries are off** locally (`playwright.config.ts`) — nothing flaky hides
  behind a re-run. CI keeps a single retry only for rare runner/infra hiccups.

### One-time local setup

Nothing beyond `pnpm install`. The platform Postgres binary is fetched and its
shared-library symlinks are hydrated by the package's approved build step (see
`pnpm-workspace.yaml` → `allowBuilds`). The cluster lives in `.tmp/test-pgdata`
(gitignored); delete it (or run with `RESET_TEST_DB=1`) for a clean init.

Raw runners (assume the DB is already up — for debugging):

```bash
pnpm test:unit:raw   # vitest run, no DB orchestration
pnpm test:e2e:raw    # playwright test, no DB orchestration
```

## Common commands

```bash
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check
pnpm db:studio    # drizzle studio (dev DB)
```
