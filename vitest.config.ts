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
    // Several suites hit the real (remote) DB; run files serially so they don't
    // contend on the pooled connection (and so the fake-notifier capture buffer
    // isn't shared across parallel files).
    fileParallelism: false,
  },
});
