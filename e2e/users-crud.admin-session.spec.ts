/** @format */

// End-to-end coverage for the admin-only user-management CRUD flow on
// /users. Happy paths only:
//   - List: seeded admin + agent users render in the table.
//   - Create: New User dialog → form submit → row appears in table.
//   - Update: Edit dialog (pre-populated) → change name → row updates.
//   - Delete: Trash button → confirm dialog → row disappears.
//
// Uses the `admin` Playwright project (storageState = ADMIN_STORAGE_STATE),
// matched via the `admin-session` substring in this file's name. Each
// mutating test uses a time-stamped fixture user so re-runs against the
// persistent test DB don't collide.
//
// Cleanup: `createUser` registers the email in `createdEmails`; the
// `afterEach` hook then DELETEs each registered user via the admin API
// (page.request inherits the page's cookies), so the test DB is left as
// it was found. Tests for the delete scenario don't need a special branch
// — the soft-deleted row no longer appears in the list, so the cleanup
// lookup naturally skips it.

import { test, expect } from "@playwright/test";
import { ADMIN_USER, AGENT_USER } from "./test-users";

function uniqueSuffix() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Per-test list of fixture emails to remove during afterEach. Reset at the
// top of every beforeEach. Safe with workers=1 (config enforces serial).
let createdEmails: string[] = [];

async function createUser(
	page: import("@playwright/test").Page,
	{ name, email, password }: { name: string; email: string; password: string },
) {
	createdEmails.push(email);
	await page.getByRole("button", { name: /new user/i }).click();
	const dialog = page.getByRole("dialog");
	await expect(
		dialog.getByRole("heading", { name: /new user/i }),
	).toBeVisible();
	await dialog.getByLabel("Name").fill(name);
	await dialog.getByLabel("Email").fill(email);
	await dialog.getByLabel("Password").fill(password);
	await dialog.getByRole("button", { name: /^create user$/i }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
}

test.describe("Users CRUD (admin)", () => {
	test.beforeEach(async ({ page }) => {
		createdEmails = [];
		await page.goto("/users");

		// `admin-session.admin.spec.ts`'s sign-out test (which sorts before
		// this file alphabetically) invalidates the saved admin session in
		// the DB. The storageState file still has the now-dead cookie, so
		// /users client-side-redirects to /login. Race the URL check with
		// the redirect — wait on a *content* condition (either the Users
		// heading or the login form is visible), then branch on what
		// actually rendered.
		const usersHeading = page.getByRole("heading", {
			name: "Users",
			level: 1,
		});
		const loginEmail = page.getByLabel("Email");
		await expect(usersHeading.or(loginEmail)).toBeVisible();

		if (await loginEmail.isVisible()) {
			await loginEmail.fill(ADMIN_USER.email);
			await page.getByLabel("Password").fill(ADMIN_USER.password);
			await page.getByRole("button", { name: /sign in/i }).click();
			await page.waitForURL("/");
			await page.goto("/users");
			await expect(usersHeading).toBeVisible();
		}
	});

	test.afterEach(async ({ page }) => {
		if (createdEmails.length === 0) return;

		// page.request shares cookies with the browser context, so this hits
		// /api/users authenticated as the admin from ADMIN_STORAGE_STATE.
		const resp = await page.request.get("/api/users");
		if (!resp.ok()) return;
		const { users } = (await resp.json()) as {
			users: Array<{ id: string; email: string }>;
		};

		for (const email of createdEmails) {
			const target = users.find((u) => u.email === email);
			if (!target) continue; // already deleted by the test (delete scenario).
			await page.request.delete(`/api/users/${target.id}`);
		}
		createdEmails = [];
	});

	test("lists the seeded admin and agent users", async ({ page }) => {
		await expect(
			page.getByRole("cell", { name: ADMIN_USER.email }),
		).toBeVisible();
		await expect(
			page.getByRole("cell", { name: AGENT_USER.email }),
		).toBeVisible();
	});

	test("creates a new user end to end", async ({ page }) => {
		const suffix = uniqueSuffix();
		const name = `E2E Created ${suffix}`;
		const email = `e2e-create-${suffix}@test.local`;

		await createUser(page, { name, email, password: "password123" });

		// New row reflects both name and email columns.
		await expect(
			page.getByRole("cell", { name, exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("cell", { name: email, exact: true }),
		).toBeVisible();
	});

	test("edits an existing user's name", async ({ page }) => {
		const suffix = uniqueSuffix();
		const initialName = `E2E ToEdit ${suffix}`;
		const updatedName = `${initialName} updated`;
		const email = `e2e-edit-${suffix}@test.local`;

		// Provision a fixture user we'll edit so this test stands alone.
		await createUser(page, {
			name: initialName,
			email,
			password: "password123",
		});

		// Open the edit dialog from the row's pencil button.
		await page.getByRole("button", { name: `Edit ${initialName}` }).click();
		const dialog = page.getByRole("dialog");
		await expect(
			dialog.getByRole("heading", { name: /edit user/i }),
		).toBeVisible();

		// Form is pre-populated; change the name and save.
		await expect(dialog.getByLabel("Name")).toHaveValue(initialName);
		await expect(dialog.getByLabel("Email")).toHaveValue(email);
		await dialog.getByLabel("Name").fill(updatedName);
		await dialog.getByRole("button", { name: /^save changes$/i }).click();

		await expect(dialog).toBeHidden();
		await expect(
			page.getByRole("cell", { name: updatedName, exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("cell", { name: initialName, exact: true }),
		).toHaveCount(0);
	});

	test("deletes an agent user via the confirm dialog", async ({ page }) => {
		const suffix = uniqueSuffix();
		const name = `E2E ToDelete ${suffix}`;
		const email = `e2e-delete-${suffix}@test.local`;

		// Provision a fixture user we'll delete.
		await createUser(page, { name, email, password: "password123" });

		// Open the confirm dialog from the row's trash button.
		await page.getByRole("button", { name: `Delete ${name}` }).click();
		const confirm = page.getByRole("alertdialog");
		await expect(
			confirm.getByRole("heading", { name: /delete user\?/i }),
		).toBeVisible();
		await expect(confirm.getByText(name)).toBeVisible();
		await expect(confirm.getByText(email)).toBeVisible();

		await confirm.getByRole("button", { name: /^delete$/i }).click();

		await expect(confirm).toBeHidden();
		await expect(
			page.getByRole("cell", { name, exact: true }),
		).toHaveCount(0);
		await expect(
			page.getByRole("cell", { name: email, exact: true }),
		).toHaveCount(0);
	});
});
