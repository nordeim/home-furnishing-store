import { defineConfig, devices } from "@playwright/test";

/**
 * NORDHEM E2E — runs against the PRODUCTION build (the dev server lies about
 * production). The webServer builds and boots `next start` on :3100 with a
 * pinned DATABASE_URL (immune to shell-env shadowing; the app degrades to the
 * static catalogue if Postgres is down, but the checkout journey needs the
 * live DB). Run: npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  outputDir: "test-results",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // The mobile navigation seam — the taxonomy from the Tailwind v4 skill:
      // open, Escape, toggle, navigate, auto-close, hamburger hidden ≥ lg.
      name: "mobile-navigation",
      testMatch: /mobile-navigation\.spec\.ts/,
      use: {
        viewport: { width: 390, height: 844 },
        browserName: "chromium",
      },
    },
    {
      name: "desktop-chromium",
      testIgnore: /mobile-navigation\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3100/api/health",
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    // Pinned env: the parent shell may export a stale DATABASE_URL — explicit
    // values win over inherited ones for the server process.
    env: {
      PORT: "3100",
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    },
  },
});
