// End-to-end coverage for the login page (unauthenticated entry point).
//
// Covers: happy-path sign-in for ADMIN and AGENT roles, server-side
// rejection of bad credentials, client-side zod validation, and the
// behavior triggered by visiting /login while already authenticated.
//
// Tests run against the real test DB seeded by e2e/global-setup.ts. The
// admin and agent test users are defined in e2e/test-users.ts.

import { test, expect } from "@playwright/test";
import { ADMIN_USER, AGENT_USER } from "./test-users";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the sign-in form", async ({ page }) => {
    // CardTitle renders as a <div> not an <h1>, so we match by text content.
    await expect(page.getByText("Sign into your account")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test.describe("happy paths", () => {
    test("ADMIN can sign in and lands on the home page with admin nav", async ({
      page,
    }) => {
      await test.step("submit valid credentials", async () => {
        await page.getByLabel("Email").fill(ADMIN_USER.email);
        await page.getByLabel("Password").fill(ADMIN_USER.password);
        await page.getByRole("button", { name: /sign in/i }).click();
      });

      await test.step("redirects to / and renders the home page", async () => {
        await expect(page).toHaveURL("/");
        await expect(
          page.getByRole("heading", { name: "Welcome", level: 1 }),
        ).toBeVisible();
      });

      await test.step("navbar reflects admin role", async () => {
        const nav = page.getByRole("navigation");
        await expect(nav.getByRole("link", { name: "Helpdesk" })).toBeVisible();
        await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
        await expect(
          nav.getByText(`${ADMIN_USER.name} (role: admin)`),
        ).toBeVisible();
        await expect(
          nav.getByRole("button", { name: /sign out/i }),
        ).toBeVisible();
      });
    });

    test("AGENT can sign in and lands on the home page without admin nav", async ({
      page,
    }) => {
      await page.getByLabel("Email").fill(AGENT_USER.email);
      await page.getByLabel("Password").fill(AGENT_USER.password);
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page).toHaveURL("/");
      await expect(
        page.getByRole("heading", { name: "Welcome", level: 1 }),
      ).toBeVisible();

      const nav = page.getByRole("navigation");
      await expect(
        nav.getByText(`${AGENT_USER.name} (role: agent)`),
      ).toBeVisible();
      // Agent must NOT see the admin-only "Users" link.
      await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
    });
  });

  test.describe("failure paths", () => {
    test("wrong password keeps the user on /login and surfaces an error", async ({
      page,
    }) => {
      await page.getByLabel("Email").fill(ADMIN_USER.email);
      await page.getByLabel("Password").fill("definitely-not-the-password");
      await page.getByRole("button", { name: /sign in/i }).click();

      // Better Auth returns an Invalid email or password error — assert that
      // *some* alert is shown rather than pinning the exact wording.
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page).toHaveURL("/login");

      // Confirm no session cookie was issued by trying to load a protected
      // route — should bounce back to /login.
      await page.goto("/");
      await expect(page).toHaveURL("/login");
    });

    test("non-existent email keeps the user on /login and surfaces an error", async ({
      page,
    }) => {
      await page
        .getByLabel("Email")
        .fill("nobody-by-this-name@test.local");
      await page.getByLabel("Password").fill("whatever-password");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("client-side validation", () => {
    test("invalid email format shows a validation error and does not submit", async ({
      page,
    }) => {
      const apiCalls: string[] = [];
      page.on("request", (req) => {
        if (req.url().includes("/api/auth/sign-in")) apiCalls.push(req.url());
      });

      await page.getByLabel("Email").fill("not-an-email");
      await page.getByLabel("Password").fill("some-password");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByText(/enter a valid email/i)).toBeVisible();
      await expect(page).toHaveURL("/login");
      expect(apiCalls).toHaveLength(0);
    });

    test("empty email shows a validation error and does not submit", async ({
      page,
    }) => {
      const apiCalls: string[] = [];
      page.on("request", (req) => {
        if (req.url().includes("/api/auth/sign-in")) apiCalls.push(req.url());
      });

      await page.getByLabel("Password").fill("some-password");
      await page.getByRole("button", { name: /sign in/i }).click();

      // zod's z.email() with an empty string produces "Enter a valid email".
      await expect(page.getByText(/enter a valid email/i)).toBeVisible();
      await expect(page).toHaveURL("/login");
      expect(apiCalls).toHaveLength(0);
    });

    test("empty password shows a validation error and does not submit", async ({
      page,
    }) => {
      const apiCalls: string[] = [];
      page.on("request", (req) => {
        if (req.url().includes("/api/auth/sign-in")) apiCalls.push(req.url());
      });

      await page.getByLabel("Email").fill(ADMIN_USER.email);
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByText(/password is required/i)).toBeVisible();
      await expect(page).toHaveURL("/login");
      expect(apiCalls).toHaveLength(0);
    });
  });

  test("visiting /login while already authenticated redirects to /", async ({
    page,
  }) => {
    // Sign in first.
    await page.getByLabel("Email").fill(ADMIN_USER.email);
    await page.getByLabel("Password").fill(ADMIN_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/");

    // Now navigate back to /login — should redirect back to /.
    await page.goto("/login");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "Welcome", level: 1 }),
    ).toBeVisible();
  });
});
