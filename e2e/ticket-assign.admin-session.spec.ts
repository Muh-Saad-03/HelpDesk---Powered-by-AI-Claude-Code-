/** @format */

// End-to-end coverage for the ticket-assignment feature, exercised against
// the running server as an authenticated ADMIN.
//
// Endpoints under test:
//   - PATCH /api/tickets/:id        body: { assigneeId: string | null }
//   - GET   /api/users/assignable
//
// Both are gated by `requireRole(Role.ADMIN, Role.AGENT)`. This spec covers
// the ADMIN side of the gate plus the validation / FK-integrity branches
// that don't depend on which role is acting:
//   - Successful assignment + returned ticket payload shape
//   - Unassignment via `assigneeId: null`
//   - 404 when the ticket id doesn't exist
//   - 400 on a malformed body (missing field; wrong type)
//   - 400 with "Assignee not found" for a non-existent user id
//   - 400 for an existing-but-soft-deleted user (the route filters
//     `deletedAt: null`)
//   - GET /assignable returns active users with the narrow projection,
//     ordered by name, and excludes soft-deleted users
//
// Tickets are created via the inbound-email webhook (signed with
// `INBOUND_EMAIL_SECRET`) so this spec doesn't depend on any seeded
// ticket fixtures. Fixture users are created/soft-deleted via the admin
// users API (`page.request` shares cookies with the admin storageState).

import { test, expect } from "@playwright/test";
import { ADMIN_USER, AGENT_USER } from "./test-users";
import { INBOUND_EMAIL_SECRET } from "./inbound-email";

function uniqueSuffix(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type AssignableUser = { id: string; name: string; email: string };
type ListedUser = { id: string; name: string; email: string; role: string };

async function createTicket(
	request: import("@playwright/test").APIRequestContext,
	overrides: Partial<{
		fromEmail: string;
		fromName: string;
		subject: string;
		body: string;
	}> = {},
): Promise<string> {
	const response = await request.post("/api/email/inbound", {
		headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
		data: {
			fromEmail: "ticket-author@example.com",
			fromName: "Ticket Author",
			subject: "Assignment fixture",
			body: "Created by ticket-assign.admin-session.spec.ts",
			...overrides,
		},
	});
	expect(response.status()).toBe(201);
	const json = (await response.json()) as { ticket: { id: string } };
	return json.ticket.id;
}

async function createFixtureUser(
	request: import("@playwright/test").APIRequestContext,
	{ name, email }: { name: string; email: string },
): Promise<string> {
	const response = await request.post("/api/users", {
		data: { name, email, password: "password123" },
	});
	expect(response.status()).toBe(201);
	const json = (await response.json()) as { user: { id: string } };
	return json.user.id;
}

async function findUserIdByEmail(
	request: import("@playwright/test").APIRequestContext,
	email: string,
): Promise<string | null> {
	const resp = await request.get("/api/users");
	if (!resp.ok()) return null;
	const { users } = (await resp.json()) as { users: ListedUser[] };
	return users.find((u) => u.email === email)?.id ?? null;
}

// Track fixtures we created so we can soft-delete them afterwards. With
// `workers: 1` (set in playwright.config.ts) sharing module-level state
// between tests is safe.
let createdUserEmails: string[] = [];

test.describe("Ticket assignment (admin) — PATCH /api/tickets/:id", () => {
	test.beforeEach(() => {
		createdUserEmails = [];
	});

	test.afterEach(async ({ request }) => {
		// Soft-delete any users this spec spun up so the test DB doesn't
		// accumulate per-run litter that would skew the assignable-users
		// ordering assertions on subsequent runs.
		for (const email of createdUserEmails) {
			const id = await findUserIdByEmail(request, email);
			if (id) {
				await request.delete(`/api/users/${id}`);
			}
		}
		createdUserEmails = [];
	});

	test("assigns a ticket to an active user and returns the updated detail", async ({
		page,
	}) => {
		// Use the seeded agent as the assignee target — already active in
		// the test DB and we don't have to create/clean up a fixture.
		const agentId = await findUserIdByEmail(page.request, AGENT_USER.email);
		expect(agentId).not.toBeNull();

		const ticketId = await createTicket(page.request);

		const response = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: agentId },
		});

		expect(response.status()).toBe(200);
		const json = (await response.json()) as {
			ticket: {
				id: string;
				assigneeId: string | null;
				assignee: AssignableUser | null;
			};
		};
		expect(json.ticket.id).toBe(ticketId);
		expect(json.ticket.assigneeId).toBe(agentId);
		expect(json.ticket.assignee).toEqual({
			id: agentId,
			name: AGENT_USER.name,
			email: AGENT_USER.email,
		});
	});

	test("clears an existing assignment when assigneeId is null", async ({
		page,
	}) => {
		const agentId = await findUserIdByEmail(page.request, AGENT_USER.email);
		expect(agentId).not.toBeNull();
		const ticketId = await createTicket(page.request);

		// Assign first…
		const assignResp = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: agentId },
		});
		expect(assignResp.status()).toBe(200);

		// …then clear.
		const clearResp = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: null },
		});
		expect(clearResp.status()).toBe(200);
		const json = (await clearResp.json()) as {
			ticket: { assigneeId: string | null; assignee: AssignableUser | null };
		};
		expect(json.ticket.assigneeId).toBeNull();
		expect(json.ticket.assignee).toBeNull();
	});

	test("returns 404 when the ticket id does not exist", async ({ page }) => {
		// Cuids are lowercase alphanumerics; this shape is well-formed but
		// will never match a real row, so the 404 branch fires.
		const ghostId = "cghost00000000000000000000";

		const response = await page.request.patch(`/api/tickets/${ghostId}`, {
			data: { assigneeId: null },
		});
		expect(response.status()).toBe(404);
		const json = (await response.json()) as { error: string };
		expect(json.error).toBe("Ticket not found");
	});

	test("returns 400 when the body is missing assigneeId", async ({ page }) => {
		const ticketId = await createTicket(page.request);

		const response = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: {},
		});
		expect(response.status()).toBe(400);
		const json = (await response.json()) as { error: string };
		// We don't pin the exact message — zod's default for a missing
		// required field has changed in past versions — but the response
		// must contain a non-empty error string.
		expect(typeof json.error).toBe("string");
		expect(json.error.length).toBeGreaterThan(0);
	});

	test("returns 400 when assigneeId is the wrong type", async ({ page }) => {
		const ticketId = await createTicket(page.request);

		const response = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: 42 },
		});
		expect(response.status()).toBe(400);
		const json = (await response.json()) as { error: string };
		expect(typeof json.error).toBe("string");
		expect(json.error.length).toBeGreaterThan(0);
	});

	test("returns 400 'Assignee not found' for a non-existent user id", async ({
		page,
	}) => {
		const ticketId = await createTicket(page.request);

		const response = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: "this-user-id-does-not-exist" },
		});
		expect(response.status()).toBe(400);
		const json = (await response.json()) as { error: string };
		expect(json.error).toBe("Assignee not found");
	});

	test("returns 400 'Assignee not found' for a soft-deleted user", async ({
		page,
	}) => {
		// Create a fixture user we can soft-delete to exercise the
		// `deletedAt: null` filter on the assignee lookup.
		const suffix = uniqueSuffix();
		const email = `e2e-soft-deleted-${suffix}@test.local`;
		const userId = await createFixtureUser(page.request, {
			name: `E2E SoftDeleted ${suffix}`,
			email,
		});
		createdUserEmails.push(email);

		// Soft-delete the user via the admin DELETE endpoint (sets
		// `deletedAt`, swaps the email to a sentinel).
		const del = await page.request.delete(`/api/users/${userId}`);
		expect(del.status()).toBe(204);

		const ticketId = await createTicket(page.request);

		const response = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: userId },
		});
		expect(response.status()).toBe(400);
		const json = (await response.json()) as { error: string };
		expect(json.error).toBe("Assignee not found");
	});
});

test.describe("Assignable users (admin) — GET /api/users/assignable", () => {
	test.beforeEach(() => {
		createdUserEmails = [];
	});

	test.afterEach(async ({ request }) => {
		for (const email of createdUserEmails) {
			const id = await findUserIdByEmail(request, email);
			if (id) {
				await request.delete(`/api/users/${id}`);
			}
		}
		createdUserEmails = [];
	});

	test("returns active users with the narrow projection, ordered by name", async ({
		page,
	}) => {
		// Provision two extra users with deterministic names that bracket
		// the seeded users alphabetically, so we can verify the ordering
		// without depending on which other rows happen to live in the test
		// DB. Names: "AAA …" sorts before "Test …", "ZZZ …" sorts after.
		const suffix = uniqueSuffix();
		const aaaName = `AAA Sorted First ${suffix}`;
		const zzzName = `ZZZ Sorted Last ${suffix}`;
		const aaaEmail = `e2e-aaa-${suffix}@test.local`;
		const zzzEmail = `e2e-zzz-${suffix}@test.local`;

		await createFixtureUser(page.request, { name: aaaName, email: aaaEmail });
		createdUserEmails.push(aaaEmail);
		await createFixtureUser(page.request, { name: zzzName, email: zzzEmail });
		createdUserEmails.push(zzzEmail);

		const response = await page.request.get("/api/users/assignable");
		expect(response.status()).toBe(200);
		const json = (await response.json()) as { users: AssignableUser[] };
		expect(Array.isArray(json.users)).toBe(true);

		// Narrow projection — no role / createdAt / etc. should leak.
		for (const u of json.users) {
			expect(Object.keys(u).sort()).toEqual(["email", "id", "name"]);
		}

		// Both seeded users + the two fixtures we just created must be present.
		const names = json.users.map((u) => u.name);
		expect(names).toContain(ADMIN_USER.name);
		expect(names).toContain(AGENT_USER.name);
		expect(names).toContain(aaaName);
		expect(names).toContain(zzzName);

		// Ordering: the AAA fixture must sit before the ZZZ fixture, and
		// the seeded ADMIN_USER ("Test Admin") and AGENT_USER ("Test Agent")
		// must sit between them in name-ascending order.
		const idxAaa = names.indexOf(aaaName);
		const idxAdmin = names.indexOf(ADMIN_USER.name);
		const idxAgent = names.indexOf(AGENT_USER.name);
		const idxZzz = names.indexOf(zzzName);
		expect(idxAaa).toBeLessThan(idxAdmin);
		expect(idxAdmin).toBeLessThan(idxAgent);
		expect(idxAgent).toBeLessThan(idxZzz);

		// And globally: the returned array must already be name-ascending.
		const sorted = [...names].sort((a, b) => a.localeCompare(b));
		expect(names).toEqual(sorted);
	});

	test("excludes soft-deleted users", async ({ page }) => {
		const suffix = uniqueSuffix();
		const email = `e2e-assignable-deleted-${suffix}@test.local`;
		const name = `E2E DeletedFromAssignable ${suffix}`;

		const userId = await createFixtureUser(page.request, { name, email });
		createdUserEmails.push(email);

		// Confirm they show up while active.
		const before = await page.request.get("/api/users/assignable");
		expect(before.status()).toBe(200);
		const beforeJson = (await before.json()) as { users: AssignableUser[] };
		expect(beforeJson.users.some((u) => u.id === userId)).toBe(true);

		// Soft-delete and re-query.
		const del = await page.request.delete(`/api/users/${userId}`);
		expect(del.status()).toBe(204);

		const after = await page.request.get("/api/users/assignable");
		expect(after.status()).toBe(200);
		const afterJson = (await after.json()) as { users: AssignableUser[] };
		expect(afterJson.users.some((u) => u.id === userId)).toBe(false);
		// Defence-in-depth: the swapped sentinel email also must not leak.
		expect(
			afterJson.users.some((u) => u.email.endsWith("@deleted.invalid")),
		).toBe(false);
	});
});
