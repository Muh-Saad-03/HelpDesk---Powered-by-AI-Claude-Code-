// Unauthenticated coverage for the tickets API. Runs in the `chromium`
// project (no storage state) so we hit the endpoint with no session
// cookie at all.

import { test, expect } from "@playwright/test";

test.describe("Tickets API — unauthenticated", () => {
	test("GET /api/tickets returns 401 without a session", async ({ request }) => {
		const response = await request.get("/api/tickets");
		expect(response.status()).toBe(401);
	});
});
