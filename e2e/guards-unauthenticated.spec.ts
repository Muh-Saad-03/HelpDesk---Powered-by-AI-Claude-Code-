// Route-guard coverage for visitors with NO session cookie.
//
// Scenarios:
//   - Direct visit to / redirects to /login (RequireAuth, no role).
//   - Direct visit to /users redirects to /login (RequireAuth role=ADMIN).
//   - Direct visit to an unknown path falls back through the SPA's
//     `<Navigate to="/" replace />`, which then enforces auth and lands
//     on /login.
//
// Also covers the server-side rule that signup is disabled — a direct
// POST to /api/auth/sign-up/email must be rejected, since there is no
// signup UI to drive in the browser.

import { test, expect } from "@playwright/test";

// LoginPage's CardTitle renders as a <div>, not an <h1>. The unique login-page
// indicator we assert on is the CardDescription text "Sign into your account".

test.describe("Route guards — unauthenticated visitor", () => {
  test("/ redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Sign into your account")).toBeVisible();
  });

  test("/users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Sign into your account")).toBeVisible();
  });

  test("unknown route falls back to / and then redirects to /login", async ({
    page,
  }) => {
    await page.goto("/this-route-does-not-exist");
    // SPA fallback: <Route path="*" element={<Navigate to="/" replace />} />
    // — and / is protected, so the visitor ends up on /login.
    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Sign into your account")).toBeVisible();
  });
});

test.describe("Server policy — signup is disabled", () => {
  test("POST /api/auth/sign-up/email is rejected", async ({ request }) => {
    const response = await request.post("/api/auth/sign-up/email", {
      data: {
        email: "should-not-be-created@test.local",
        password: "irrelevant-password-1234",
        name: "Should Not Exist",
      },
    });

    // Better Auth surfaces SIGNUP_DISABLED as a 4xx error response.
    // Don't pin the exact code or message — just assert the request was
    // rejected and the user wasn't created.
    expect(response.ok()).toBe(false);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);

    // Round-trip: try to sign in as the would-be user. It should fail
    // because the account was never created.
    const signInResponse = await request.post("/api/auth/sign-in/email", {
      data: {
        email: "should-not-be-created@test.local",
        password: "irrelevant-password-1234",
      },
    });
    expect(signInResponse.ok()).toBe(false);
  });
});
