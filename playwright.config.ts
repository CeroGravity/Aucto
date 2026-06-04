import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Prefer a system Chromium-family browser when present (the Playwright CDN
// download is blocked in this environment); otherwise fall back to the bundled
// chromium installed via `pnpm exec playwright install chromium`.
function systemChromiumPath(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/brave",
  ];
  return candidates.find((path) => existsSync(path));
}

const executablePath = systemChromiumPath();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The suite runs against a LOCAL embedded Postgres (see scripts/with-test-db),
  // so there is no remote latency to mask — retries stay OFF so nothing flaky
  // hides behind a re-run. (A single CI retry guards only against rare
  // infra/runner hiccups, not test flake.)
  retries: process.env.CI ? 1 : 0,
  // Serial run keeps results reproducible when driving a system browser
  // (parallel instances starve CPU and make navigations flaky). This is a
  // browser/CPU constraint, not a DB one.
  workers: 1,
  // Local DB is fast; keep a comfortable margin for the first action per server
  // boot (Next route compile) without being so loose it hides hangs.
  timeout: 30_000,
  expect: { timeout: 7_500 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Unset the bundled "chromium" channel so launchOptions.executablePath
        // (system Chromium/Brave) is honored when the bundled browser is absent.
        channel: undefined,
      },
    },
  ],
  webServer: {
    // `next start` directly (not the `pnpm start` wrapper) so it inherits the
    // env from scripts/with-test-db.ts — DATABASE_URL already points at the
    // local embedded Postgres. The wrapper's --env-file-if-exists=.env.local
    // would otherwise reload the Neon prod URL over it.
    command: "pnpm build && node node_modules/next/dist/bin/next start",
    url: "http://localhost:3000",
    // Never reuse a server across invocations: each run boots its own embedded
    // Postgres, and a server left over from a prior run would point at a cluster
    // that no longer exists — a source of cross-run flake. Always start fresh.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
