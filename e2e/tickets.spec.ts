// Unauthenticated coverage for the tickets API. Runs in the `chromium`
// project (no storage state) so we hit the endpoint with no session
// cookie at all.

import { test, expect } from "@playwright/test";

test.describe("Tickets API — unauthenticated", () => {
	test("GET /api/tickets returns 401 without a session", async ({ request }) => {
		const response = await request.get("/api/tickets");
		expect(response.status()).toBe(401);
	});

	test("PATCH /api/tickets/:id returns 401 without a session", async ({
		request,
	}) => {
		// Use a syntactically plausible cuid; the auth check fires before any
		// DB lookup, so the id never has to exist for this assertion.
		const response = await request.patch("/api/tickets/clxxxxxxxxxxxxxxxxxxxxxxx", {
			data: { assigneeId: null },
		});
		expect(response.status()).toBe(401);
	});
});

test.describe("Assignable users API — unauthenticated", () => {
	test("GET /api/users/assignable returns 401 without a session", async ({
		request,
	}) => {
		const response = await request.get("/api/users/assignable");
		expect(response.status()).toBe(401);
	});
});
