/** @format */

import { tool, type ToolSet } from "ai";
import { VOICE_TOOL_SCHEMAS } from "core";
import { TOOL_DESCRIPTIONS } from "./assistant.ts";
import {
	createTicketReply,
	getTicketDetail,
	getTicketReplies,
	getTicketStats,
	listTickets,
} from "./ticketQueries.ts";

// Server-side execution of the same tools the voice assistant runs in the
// browser (client/src/lib/voiceTools.ts). Outputs match the voice dispatch
// shapes — the client widget templates bind to these fields. "Not found" is
// returned as data (not thrown) so the model can answer normally instead of
// surfacing a stream error.

const CHAT_PAGE_SIZE = 10;

export function buildChatTools(user: { id: string }): ToolSet {
	return {
		search_tickets: tool({
			description: TOOL_DESCRIPTIONS.search_tickets,
			inputSchema: VOICE_TOOL_SCHEMAS.search_tickets,
			execute: async ({ query, status, category, page }) =>
				listTickets({
					q: query,
					status: status ? [status] : undefined,
					category: category ? [category] : undefined,
					page: page ?? 1,
					pageSize: CHAT_PAGE_SIZE,
					sortBy: "createdAt",
					sortOrder: "desc",
				}),
		}),
		get_ticket: tool({
			description: TOOL_DESCRIPTIONS.get_ticket,
			inputSchema: VOICE_TOOL_SCHEMAS.get_ticket,
			execute: async ({ ticket_id }) =>
				(await getTicketDetail(ticket_id)) ?? { error: "Ticket not found" },
		}),
		get_ticket_replies: tool({
			description: TOOL_DESCRIPTIONS.get_ticket_replies,
			inputSchema: VOICE_TOOL_SCHEMAS.get_ticket_replies,
			execute: async ({ ticket_id }) => {
				const replies = await getTicketReplies(ticket_id);
				return replies ? { replies } : { error: "Ticket not found" };
			},
		}),
		get_ticket_stats: tool({
			description: TOOL_DESCRIPTIONS.get_ticket_stats,
			inputSchema: VOICE_TOOL_SCHEMAS.get_ticket_stats,
			execute: async () => getTicketStats(),
		}),
		reply_to_ticket: tool({
			description: TOOL_DESCRIPTIONS.reply_to_ticket,
			inputSchema: VOICE_TOOL_SCHEMAS.reply_to_ticket,
			execute: async ({ ticket_id, body }) => {
				const reply = await createTicketReply(ticket_id, user.id, body);
				return reply ? { reply } : { error: "Ticket not found" };
			},
		}),
	};
}
