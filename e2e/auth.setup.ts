// Authenticates the seeded ADMIN and AGENT users once per test run via the
// real login flow, then persists each session's cookies/localStorage to
// `playwright/.auth/<role>.json`. Other projects load these files via
// `storageState` so they start signed in.
//
// Re-run automatically because the `setup` project is listed as a
// `dependencies` entry on the auth-using projects in playwright.config.ts.

import { test as setup, expect } from "@playwright/test";
import { ADMIN_USER, AGENT_USER } from "./test-users";
import {
  ADMIN_STORAGE_STATE,
  AGENT_STORAGE_STATE,
} from "../playwright.config";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_USER.email);
  await page.getByLabel("Password").fill(ADMIN_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Login redirects to "/" on success — wait for that before snapshotting
  // cookies so we don't capture an in-flight auth state.
  await page.waitForURL("/");
  await expect(
    page.getByRole("heading", { name: "Welcome", level: 1 }),
  ).toBeVisible();

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});

setup("authenticate as agent", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(AGENT_USER.email);
  await page.getByLabel("Password").fill(AGENT_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("/");
  await expect(
    page.getByRole("heading", { name: "Welcome", level: 1 }),
  ).toBeVisible();

  await page.context().storageState({ path: AGENT_STORAGE_STATE });
});
