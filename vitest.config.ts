import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    passWithNoTests: true,
    // Two suites (restore-stock, dispatch-notify) create + mutate rows in the
    // single shared test DB. Run test FILES serially so they don't race each
    // other's order/stock state — this is data isolation against one DB, not a
    // latency workaround (the DB is local). Tests within a file still run in
    // order; pure-formatter suites are unaffected.
    fileParallelism: false,
  },
});
