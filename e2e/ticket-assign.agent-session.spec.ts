/** @format */

// Role-gating coverage for the ticket-assignment endpoints from the AGENT
// side of the gate. Both endpoints accept ADMIN *and* AGENT — the admin
// path is exercised in `ticket-assign.admin-session.spec.ts`; this file
// confirms that the same calls succeed when the caller is an AGENT.
//
// Endpoints under test:
//   - PATCH /api/tickets/:id        body: { assigneeId: string | null }
//   - GET   /api/users/assignable
//
// Tickets are created via the inbound-email webhook (signed with
// `INBOUND_EMAIL_SECRET`). The agent has no /api/users access — but the
// PATCH path only needs an existing user *id*, which we can read straight
// out of GET /api/users/assignable as the agent itself.

import { test, expect } from "@playwright/test";
import { AGENT_USER } from "./test-users";
import { INBOUND_EMAIL_SECRET } from "./inbound-email";

type AssignableUser = { id: string; name: string; email: string };

async function createTicket(
	request: import("@playwright/test").APIRequestContext,
): Promise<string> {
	const response = await request.post("/api/email/inbound", {
		headers: { "X-Webhook-Secret": INBOUND_EMAIL_SECRET },
		data: {
			fromEmail: "ticket-author@example.com",
			fromName: "Ticket Author",
			subject: "Assignment fixture (agent)",
			body: "Created by ticket-assign.agent-session.spec.ts",
		},
	});
	expect(response.status()).toBe(201);
	const json = (await response.json()) as { ticket: { id: string } };
	return json.ticket.id;
}

test.describe("Ticket assignment (agent)", () => {
	test("GET /api/users/assignable succeeds for AGENT and includes the agent itself", async ({
		page,
	}) => {
		const response = await page.request.get("/api/users/assignable");
		expect(response.status()).toBe(200);
		const { users } = (await response.json()) as { users: AssignableUser[] };
		expect(Array.isArray(users)).toBe(true);

		// The seeded agent must be in the list — agents need to be able to
		// reassign tickets to themselves or peers.
		const self = users.find((u) => u.email === AGENT_USER.email);
		expect(self).toBeDefined();
		expect(self?.name).toBe(AGENT_USER.name);

		// Same narrow projection as in the admin spec — no extra fields.
		for (const u of users) {
			expect(Object.keys(u).sort()).toEqual(["email", "id", "name"]);
		}
	});

	test("PATCH /api/tickets/:id assigns to a user and clears the assignment as AGENT", async ({
		page,
	}) => {
		// Look up the agent's own id via the assignable list — the agent has
		// no /api/users access, but /api/users/assignable is open to AGENT.
		const listResp = await page.request.get("/api/users/assignable");
		expect(listResp.status()).toBe(200);
		const { users } = (await listResp.json()) as { users: AssignableUser[] };
		const agent = users.find((u) => u.email === AGENT_USER.email);
		expect(agent).toBeDefined();
		const agentId = agent!.id;

		const ticketId = await createTicket(page.request);

		// Assign as the agent.
		const assignResp = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: agentId },
		});
		expect(assignResp.status()).toBe(200);
		const assigned = (await assignResp.json()) as {
			ticket: { assigneeId: string | null; assignee: AssignableUser | null };
		};
		expect(assigned.ticket.assigneeId).toBe(agentId);
		expect(assigned.ticket.assignee?.email).toBe(AGENT_USER.email);

		// Clear as the agent.
		const clearResp = await page.request.patch(`/api/tickets/${ticketId}`, {
			data: { assigneeId: null },
		});
		expect(clearResp.status()).toBe(200);
		const cleared = (await clearResp.json()) as {
			ticket: { assigneeId: string | null; assignee: AssignableUser | null };
		};
		expect(cleared.ticket.assigneeId).toBeNull();
		expect(cleared.ticket.assignee).toBeNull();
	});
});
