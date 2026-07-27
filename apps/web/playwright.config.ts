import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Some sandboxed dev environments pre-install Chromium at a fixed path
// instead of via `playwright install` — use it when present so this
// config works there without a download step. Real CI (and any normal
// machine) doesn't have this path, so it just falls through to
// Playwright's own managed browser there.
const SANDBOX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const executablePath = existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined;

/**
 * These are placeholder values, never real secrets — just enough for
 * `next build`'s static analysis (which touches the auth route bundle
 * even for pages that don't need a session) and next-auth's own config
 * check to not throw. The signed-out pages these E2E tests cover never
 * actually call Supabase, so a real database isn't needed here.
 */
const DUMMY_ENV = {
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_SERVICE_ROLE_KEY: "e2e-placeholder-not-a-real-secret",
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-placeholder-not-a-real-secret",
  AUTH_SECRET: "e2e-placeholder-not-a-real-secret",
  AUTH_GITHUB_ID: "e2e-placeholder",
  AUTH_GITHUB_SECRET: "e2e-placeholder-not-a-real-secret",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: DUMMY_ENV,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
  ],
});
