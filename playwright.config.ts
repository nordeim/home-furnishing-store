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
  // Task 126 F-9: list for the terminal, HTML for post-run inspection (the
  // homenest posture) — open: "never" keeps CI/local runs non-interactive;
  // view a failed run with `npx playwright show-report`.
  reporter: [["list"], ["html", { open: "never" }]],
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
      // Task 125 G-7: devices["iPhone 13"] keeps the same 390×844 viewport
      // and adds touch emulation (hasTouch), DPR 3 and a real mobile UA —
      // the only way the suite sees the phone-side rendering of Tailwind v4
      // hover-gated variants (@media (hover: hover) never matches).
      name: "mobile-navigation",
      testMatch: /mobile-navigation\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
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
    // Task 142 H-4: the suite ALWAYS boots its own pinned server. The old
    // `!process.env.CI` form silently reused a stale :3100 server WITHOUT
    // the env pins below — every XFF identity collapsed into the shared
    // "direct" bucket and unrelated specs 429'd mid-suite. A stale :3100
    // now fails immediately with EADDRINUSE (kill it first:
    // `pkill -f next-server` — the wrapper process is named next-server).
    reuseExistingServer: false,
    // Pinned env: the parent shell may export a stale DATABASE_URL — explicit
    // values win over inherited ones for the server process.
    env: {
      PORT: "3100",
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
      // Task 141 G: the rate-limit probes below key their identities on
      // x-forwarded-for (39 sites, 36 distinct identities) — under the
      // TRUST_PROXY gate they would
      // collapse into ONE shared "direct" bucket and 429 mid-suite. The
      // e2e server runs "behind" Playwright's own loopback proxy posture,
      // so it opts INTO the promoted trust explicitly.
      TRUST_PROXY: "1",
    },
  },
});
