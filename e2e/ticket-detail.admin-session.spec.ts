/** @format */

// End-to-end coverage for the ticket detail page (`/tickets/:id`),
// exercised against the running server as an authenticated ADMIN. Mirrors
// the role choice in `ticket-assign.admin-session.spec.ts` — the
// ticket-mutating endpoints accept ADMIN + AGENT, but admin is the
// canonical session for ticket-mutation specs in this repo.
//
// Coverage is deliberately scoped to behaviour that genuinely needs the
// real server + DB + cookie session — anything that can be expressed
// against the React component with mocked HTTP belongs in
// `client/src/pages/TicketDetailPage.test.tsx`. So:
//
//   - Visiting /tickets/:id renders the live server payload (subject,
//     body, From line) for a freshly-created ticket.
//   - Visiting /tickets/<bogus-id> surfaces the server's 404 as the
//     "Ticket not found." alert.
//   - The "Back to tickets" link returns to /tickets in a real browser.
//   - Posting a reply through the form persists in the DB: textarea
//     clears, the new reply renders, and a hard reload still shows it.
//   - Changing Status / Category / Assignee selects round-trip through
//     PATCH /api/tickets/:id and survive a hard reload.
//
// The unauthenticated /tickets/:id redirect is intentionally NOT covered
// here — `RequireAuth` is purely a client-side guard, the same component
// that already protects the routes covered by
// `guards-unauthenticated.spec.ts`. That spec already exercises the guard
// for / and /users; adding a third URL would be redundant. The
// server-side gate on the underlying API is covered by the 401 cases in
// `tickets.spec.ts`.
//
// Tickets are created via the inbound-email webhook (signed with
// `INBOUND_EMAIL_SECRET`) so this spec doesn't depend on any seeded
// ticket fixtures. The seeded admin/agent users are reused for assignee
// round-trips so we don't have to provision/clean up extra users.

import { test, expect, type Page } from "@playwright/test";
import { TicketStatus, TicketCategory } from "core";
import { ADMIN_USER, AGENT_USER } from "./test-users";
import { INBOUND_EMAIL_SECRET } from "./inbound-email";

type AssignableUser = { id: string; name: string; email: string };

async function createTicket(
	request: import("@playwright/test").APIRequestContext,
	overrides: Partial<{
		fromEmail: string;
		fromName: string;
		subject: string;
		body: string;
	}> = {},
): Promise<{ id: string; subject: string; body: string; fromEmail: string; fromName: string }> {
	const data = {
		fromEmail: "ticket-author@example.com",
		fromName: "Ticket Author",
		subject: "Detail-page fixture",
		body: "Created by ticket-detail.admin-session.spec.ts",
		...overrides,
	};
	const response = await request.post("/api/email/inbound", {
		headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
		data,
	});
	expect(response.status()).toBe(201);
	const json = (await response.json()) as { ticket: { id: string } };
	return { id: json.ticket.id, ...data };
}

async function findUserIdByEmail(
	request: import("@playwright/test").APIRequestContext,
	email: string,
): Promise<string> {
	const resp = await request.get("/api/users/assignable");
	expect(resp.status()).toBe(200);
	const { users } = (await resp.json()) as { users: AssignableUser[] };
	const found = users.find((u) => u.email === email);
	if (!found) throw new Error(`Seeded user ${email} not found in /api/users/assignable`);
	return found.id;
}

// Re-fetch the persisted ticket via the API so reload-style assertions
// can verify the field actually landed in the DB without depending on
// React Query caches or in-flight rendering.
async function getTicketField<K extends "status" | "category" | "assigneeId">(
	page: Page,
	ticketId: string,
	field: K,
): Promise<unknown> {
	const resp = await page.request.get(`/api/tickets/${ticketId}`);
	expect(resp.status()).toBe(200);
	const json = (await resp.json()) as {
		ticket: Record<string, unknown>;
	};
	return json.ticket[field];
}

test.describe("Ticket detail page (admin)", () => {
	test("renders the ticket subject, body, and From line for a real seeded ticket", async ({
		page,
	}) => {
		const ticket = await createTicket(page.request, {
			subject: "Detail render fixture — billing",
			body: "I was charged twice for my October subscription.",
			fromEmail: "render-jane@example.com",
			fromName: "Render Jane",
		});

		await page.goto(`/tickets/${ticket.id}`);

		// Subject renders as the page's <h1>.
		await expect(
			page.getByRole("heading", { name: ticket.subject, level: 1 }),
		).toBeVisible();

		// Body is in the message box.
		await expect(page.getByText(ticket.body)).toBeVisible();

		// From line: name + <email> both render.
		await expect(page.getByText(ticket.fromName).first()).toBeVisible();
		await expect(page.getByText(`<${ticket.fromEmail}>`)).toBeVisible();
	});

	test("shows the 'Ticket not found.' alert for an id that doesn't exist", async ({
		page,
	}) => {
		// Cuid-shaped but guaranteed not to match a row, so the server's
		// 404 branch fires and the page surfaces its 404 alert.
		const ghostId = "cghost00000000000000000000";

		await page.goto(`/tickets/${ghostId}`);

		const alert = page.getByRole("alert");
		await expect(alert).toBeVisible();
		await expect(alert).toContainText(/ticket not found\.?/i);
	});

	test("'Back to tickets' link returns to /tickets", async ({ page }) => {
		const ticket = await createTicket(page.request, {
			subject: "Back-link fixture",
		});

		await page.goto(`/tickets/${ticket.id}`);
		await expect(
			page.getByRole("heading", { name: ticket.subject, level: 1 }),
		).toBeVisible();

		await page.getByRole("link", { name: /back to tickets/i }).click();
		await expect(page).toHaveURL("/tickets");
		await expect(
			page.getByRole("heading", { name: "Tickets", level: 1 }),
		).toBeVisible();
	});

	test("posting a reply persists, clears the textarea, and survives a reload", async ({
		page,
	}) => {
		const ticket = await createTicket(page.request, {
			subject: "Reply round-trip fixture",
		});

		await page.goto(`/tickets/${ticket.id}`);
		await expect(
			page.getByRole("heading", { name: ticket.subject, level: 1 }),
		).toBeVisible();

		// Empty state appears before any replies exist.
		await expect(page.getByText(/no replies yet\.?/i)).toBeVisible();

		const replyBody =
			"Thanks for reporting this — looking into the duplicate charge now.";
		const textarea = page.getByLabel(/add a reply/i);
		await textarea.fill(replyBody);
		await page.getByRole("button", { name: /send reply/i }).click();

		// New reply appears in the list.
		await expect(page.getByText(replyBody)).toBeVisible();
		// Author label resolves to the signed-in admin's name, with the
		// "Agent" pill for agent-authored replies.
		const replyItem = page
			.getByRole("listitem")
			.filter({ hasText: replyBody });
		await expect(replyItem).toContainText(ADMIN_USER.name);
		await expect(replyItem).toContainText("Agent");

		// Textarea is cleared after a successful submit.
		await expect(textarea).toHaveValue("");

		// Empty-state line is gone now that there's a reply.
		await expect(page.getByText(/no replies yet\.?/i)).toHaveCount(0);

		// Hard reload — the reply must still be there (i.e. it persisted in
		// the DB, it wasn't just an optimistic UI artefact).
		await page.reload();
		await expect(
			page.getByRole("heading", { name: ticket.subject, level: 1 }),
		).toBeVisible();
		await expect(page.getByText(replyBody)).toBeVisible();
	});

	test("changing Status round-trips and persists across a reload", async ({
		page,
	}) => {
		const ticket = await createTicket(page.request, {
			subject: "Status round-trip fixture",
		});

		await page.goto(`/tickets/${ticket.id}`);
		const statusSelect = page.getByLabel("Status");
		await expect(statusSelect).toHaveValue(TicketStatus.OPEN);

		await statusSelect.selectOption(TicketStatus.RESOLVED);

		// Wait for the mutation to commit server-side. Polling the API
		// directly is the most reliable signal — the UI's `Saving…` flash is
		// transient and can be missed.
		await expect
			.poll(() => getTicketField(page, ticket.id, "status"))
			.toBe(TicketStatus.RESOLVED);

		// Reload and confirm the select renders the new value (proving the
		// server returned RESOLVED on the fresh GET).
		await page.reload();
		await expect(page.getByLabel("Status")).toHaveValue(TicketStatus.RESOLVED);
	});

	test("changing Category round-trips and persists across a reload", async ({
		page,
	}) => {
		const ticket = await createTicket(page.request, {
			subject: "Category round-trip fixture",
		});

		await page.goto(`/tickets/${ticket.id}`);
		const categorySelect = page.getByLabel("Category");
		// Tickets created via the inbound webhook start uncategorised
		// (category = null), which renders as the empty-string option.
		await expect(categorySelect).toHaveValue("");

		await categorySelect.selectOption(TicketCategory.TECHNICAL_QUESTION);

		await expect
			.poll(() => getTicketField(page, ticket.id, "category"))
			.toBe(TicketCategory.TECHNICAL_QUESTION);

		await page.reload();
		await expect(page.getByLabel("Category")).toHaveValue(
			TicketCategory.TECHNICAL_QUESTION,
		);
	});

	test("changing Assignee round-trips and persists across a reload", async ({
		page,
	}) => {
		const ticket = await createTicket(page.request, {
			subject: "Assignee round-trip fixture",
		});
		const agentId = await findUserIdByEmail(page.request, AGENT_USER.email);

		await page.goto(`/tickets/${ticket.id}`);
		const assigneeSelect = page.getByLabel("Assignee");
		// Default value is "" (Unassigned) for a brand-new ticket.
		await expect(assigneeSelect).toHaveValue("");

		await assigneeSelect.selectOption(agentId);

		await expect
			.poll(() => getTicketField(page, ticket.id, "assigneeId"))
			.toBe(agentId);

		await page.reload();
		await expect(page.getByLabel("Assignee")).toHaveValue(agentId);
	});
});
