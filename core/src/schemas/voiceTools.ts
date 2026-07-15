import { z } from "zod";
import { TicketCategory } from "../enums/ticketCategory.ts";
import { TicketStatus } from "../enums/ticketStatus.ts";

// Argument schemas for the voice assistant's function tools. The server
// converts these to JSON Schema for the Realtime session config
// (z.toJSONSchema), and the client validates the model's arguments with the
// same schemas before dispatching — one source of truth, no drift.
//
// Single-value status/category (not arrays): the tickets list endpoint's
// `arrayOf` union accepts a bare string, and single values are easier for
// the model to produce reliably.

export const searchTicketsArgsSchema = z.object({
	query: z
		.string()
		.min(1)
		.optional()
		.describe("Free-text search over subject, customer name, and customer email"),
	status: z.enum(TicketStatus).optional().describe("Filter by ticket status"),
	category: z.enum(TicketCategory).optional().describe("Filter by ticket category"),
	page: z.number().int().min(1).optional().describe("Page number, starting at 1"),
});
export type SearchTicketsArgs = z.infer<typeof searchTicketsArgsSchema>;

export const getTicketArgsSchema = z.object({
	ticket_id: z.string().min(1).describe("The ticket id"),
});
export type GetTicketArgs = z.infer<typeof getTicketArgsSchema>;

export const getTicketRepliesArgsSchema = getTicketArgsSchema;

export const getTicketStatsArgsSchema = z.object({});

export const replyToTicketArgsSchema = z.object({
	ticket_id: z.string().min(1).describe("The ticket id to reply on"),
	body: z
		.string()
		.min(1)
		.describe(
			"The reply text, exactly as confirmed by the staff member. It is emailed to the customer verbatim.",
		),
});
export type ReplyToTicketArgs = z.infer<typeof replyToTicketArgsSchema>;

export const VOICE_TOOL_SCHEMAS = {
	search_tickets: searchTicketsArgsSchema,
	get_ticket: getTicketArgsSchema,
	get_ticket_replies: getTicketRepliesArgsSchema,
	get_ticket_stats: getTicketStatsArgsSchema,
	reply_to_ticket: replyToTicketArgsSchema,
} as const;
export type VoiceToolName = keyof typeof VOICE_TOOL_SCHEMAS;
