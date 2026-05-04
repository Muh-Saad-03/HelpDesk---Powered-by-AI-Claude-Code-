// Coverage for an authenticated AGENT session.
//
// Uses the `agent` Playwright project, which loads the storageState
// produced by e2e/auth.setup.ts (`playwright/.auth/agent.json`). All
// tests here start signed in as the seeded test agent.
//
// Scenarios:
//   - Direct visit to / renders the home page.
//   - Navbar shows the user name + agent role label and sign-out button,
//     but NOT the admin-only "Users" link.
//   - Direct visit to /users redirects to / (admin-only route).
//   - Session persists across a full page reload.
//   - Sign-out clears the session and bounces protected-route visits to
//     /login.

import { test, expect } from "@playwright/test";
import { AGENT_USER } from "./test-users";

test.describe("Agent session", () => {
  test("/ renders the home page with agent nav (no Users link)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "Welcome", level: 1 }),
    ).toBeVisible();

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Helpdesk" })).toBeVisible();
    await expect(
      nav.getByText(AGENT_USER.name),
    ).toBeVisible();
    await expect(
      nav.getByRole("button", { name: /sign out/i }),
    ).toBeVisible();

    // Admin-only link must not be in the navbar.
    await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
  });

  test("/users redirects to / (admin-only)", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "Welcome", level: 1 }),
    ).toBeVisible();
    // Confirm we never rendered the Users page heading at any point.
    await expect(
      page.getByRole("heading", { name: "Users", level: 1 }),
    ).toHaveCount(0);
  });

  test("session persists across a full page reload", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Welcome", level: 1 }),
    ).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "Welcome", level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation")
        .getByText(AGENT_USER.name),
    ).toBeVisible();
  });

  test("sign-out clears the session", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /sign out/i })
      .click();

    await expect(page).toHaveURL("/login");
    // CardTitle renders as a <div>, so assert via the unique CardDescription.
    await expect(page.getByText("Sign into your account")).toBeVisible();

    // Protected routes must now bounce to /login.
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });
});
