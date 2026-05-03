import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const CLIENT_URL = "http://localhost:5173";
const SERVER_URL = "http://localhost:3001";

// Storage-state file paths — exported so auth.setup.ts can reference them
// without hardcoding strings in two places.
// NOTE: Playwright's config loader runs in a CJS/Node context, so we use
// path.resolve(__dirname, ...) rather than import.meta.dirname.
export const ADMIN_STORAGE_STATE = path.resolve(
  __dirname,
  "playwright/.auth/admin.json",
);
export const AGENT_STORAGE_STATE = path.resolve(
  __dirname,
  "playwright/.auth/agent.json",
);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single worker keeps cookie-based auth state predictable and prevents
  // parallel tests from racing on sign-out / DB state mutations.
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: CLIENT_URL,
    trace: "on-first-retry",
  },
  projects: [
    // ------------------------------------------------------------------ //
    // 1. Setup project — signs in once per role and persists storage state.
    //    Auth-using projects declare this as a dependency so Playwright
    //    always runs it first.
    // ------------------------------------------------------------------ //
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // ------------------------------------------------------------------ //
    // 2. Unauthenticated / login-form tests — no storage state.
    //    Run from a clean browser context so we observe the real login flow
    //    and redirect behaviour without any pre-seeded cookies.
    // ------------------------------------------------------------------ //
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [
        /auth\.setup\.ts/,
        /admin-session/,
        /agent-session/,
      ],
    },

    // ------------------------------------------------------------------ //
    // 3. Admin-session tests — starts every test signed in as ADMIN.
    // ------------------------------------------------------------------ //
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ADMIN_STORAGE_STATE,
      },
      testMatch: /admin-session/,
      dependencies: ["setup"],
    },

    // ------------------------------------------------------------------ //
    // 4. Agent-session tests — starts every test signed in as AGENT.
    // ------------------------------------------------------------------ //
    {
      name: "agent",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AGENT_STORAGE_STATE,
      },
      testMatch: /agent-session/,
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      name: "server",
      command: "bun --filter server dev",
      cwd: ".",
      url: `${SERVER_URL}/api/health`,
      // NODE_ENV=test causes Bun's env loader to pick up server/.env.test
      // automatically, giving us the test DB credentials and auth secret.
      env: { NODE_ENV: "test" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      name: "client",
      command: "bun --filter client dev",
      cwd: ".",
      url: CLIENT_URL,
      env: { NODE_ENV: "test" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
