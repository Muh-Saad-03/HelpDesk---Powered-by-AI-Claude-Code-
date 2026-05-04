import { z } from "zod";
import { TicketCategory } from "../enums/ticketCategory.ts";
import { TicketStatus } from "../enums/ticketStatus.ts";

// Partial-update body for PATCH /api/tickets/:id. Every field is optional, but
// the request must include at least one — empty bodies are rejected so we
// don't silently no-op an obvious bug. `null` on `assigneeId` / `category`
// clears the field; `null` on `status` is not meaningful (status is required
// on the model) and is therefore not allowed.
export const updateTicketSchema = z
	.object({
		assigneeId: z
			.string()
			.min(1, "Assignee id is required")
			.nullable()
			.optional(),
		status: z.enum(TicketStatus).optional(),
		category: z.enum(TicketCategory).nullable().optional(),
	})
	.refine((data) => Object.values(data).some((v) => v !== undefined), {
		message: "At least one field must be provided",
	});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
