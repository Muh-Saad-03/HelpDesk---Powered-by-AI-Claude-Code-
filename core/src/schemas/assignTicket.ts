import { z } from "zod";

// Body for PATCH /api/tickets/:id when changing the assignee. `null` clears
// the assignment ("Unassigned"); any non-empty string is the user id of the
// new assignee. The server still verifies the id resolves to an active user.
export const assignTicketSchema = z.object({
	assigneeId: z
		.string()
		.min(1, "Assignee id is required")
		.nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
