/** @format */

// Coverage for an authenticated ADMIN session.
//
// Uses the `admin` Playwright project, which loads the storageState
// produced by e2e/auth.setup.ts (`playwright/.auth/admin.json`). All
// tests here start signed in as the seeded test admin.
//
// Scenarios:
//   - Direct visit to / renders the home page.
//   - Navbar shows the admin "Users" link, the user name + role label,
//     and a sign-out button.
//   - Direct visit to /users renders the Users page heading.
//   - Session persists across a hard reload.
//   - Sign-out clears the session and redirects to /login; refreshing
//     /login keeps the user on /login (no zombie session).

import { test, expect } from "@playwright/test";
import { ADMIN_USER } from "./test-users";

test.describe("Admin session", () => {
	test("/ renders the home page with admin nav", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveURL("/");
		await expect(
			page.getByRole("heading", { name: "Welcome", level: 1 }),
		).toBeVisible();

		const nav = page.getByRole("navigation");
		await expect(nav.getByRole("link", { name: "Helpdesk" })).toBeVisible();
		await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
		await expect(
			nav.getByText(ADMIN_USER.name),
		).toBeVisible();
		await expect(nav.getByRole("button", { name: /sign out/i })).toBeVisible();
	});

	test("/users renders the Users page", async ({ page }) => {
		await page.goto("/users");
		await expect(page).toHaveURL("/users");
		await expect(
			page.getByRole("heading", { name: "Users", level: 1 }),
		).toBeVisible();
	});

	test("clicking the navbar Users link navigates to /users", async ({
		page,
	}) => {
		await page.goto("/");
		await page
			.getByRole("navigation")
			.getByRole("link", { name: "Users" })
			.click();
		await expect(page).toHaveURL("/users");
		await expect(
			page.getByRole("heading", { name: "Users", level: 1 }),
		).toBeVisible();
	});

	test("session persists across a full page reload", async ({ page }) => {
		await page.goto("/");
		await expect(
			page.getByRole("heading", { name: "Welcome", level: 1 }),
		).toBeVisible();

		await page.reload();

		// Still on / and still rendering protected content (would have been
		// bounced to /login if the session hadn't survived the reload).
		await expect(page).toHaveURL("/");
		await expect(
			page.getByRole("heading", { name: "Welcome", level: 1 }),
		).toBeVisible();
		await expect(
			page
				.getByRole("navigation")
				.getByText(ADMIN_USER.name),
		).toBeVisible();
	});

	test("sign-out clears the session and prevents return to protected routes", async ({
		page,
	}) => {
		await page.goto("/");

		await test.step("click Sign out in the navbar", async () => {
			await page
				.getByRole("navigation")
				.getByRole("button", { name: /sign out/i })
				.click();
			await expect(page).toHaveURL("/login");
			// CardTitle renders as a <div>, so assert via the unique CardDescription.
			await expect(page.getByText("Sign into your account")).toBeVisible();
		});

		await test.step("revisiting / bounces back to /login", async () => {
			await page.goto("/");
			await expect(page).toHaveURL("/login");
		});

		await test.step("revisiting /users also bounces back to /login", async () => {
			await page.goto("/users");
			await expect(page).toHaveURL("/login");
		});
	});
});
