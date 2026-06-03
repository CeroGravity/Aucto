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
  // Retry transient failures: the suite drives a remote Neon DB whose latency
  // occasionally spikes past an action timeout. Retries let those self-recover
  // (a genuine failure still fails on every attempt).
  retries: 2,
  // Serial run keeps results reproducible when driving a system browser
  // (parallel instances starve CPU and make navigations flaky).
  workers: 1,
  // Generous timeouts: server actions hit Neon (cold round-trips), and the
  // first action per server boot is slow.
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
