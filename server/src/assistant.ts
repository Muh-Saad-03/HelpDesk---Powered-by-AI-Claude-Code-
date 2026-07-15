/** @format */

import type { VoiceToolName } from "core";

// Shared assistant configuration for the two AI surfaces — the Realtime
// voice assistant (voice.ts) and the text chat endpoint (routes/chat.ts).
// Both expose the same read-only ticket tools, so descriptions and the
// instruction preamble live here to keep the surfaces in sync.

export const TOOL_DESCRIPTIONS: Record<VoiceToolName, string> = {
	search_tickets:
		"Search and list helpdesk tickets. Returns one page of matching tickets plus the total count.",
	get_ticket:
		"Get full detail for one ticket by id: subject, body, status, category, customer, assignee, timestamps.",
	get_ticket_replies:
		"Get the conversation history (replies) for a ticket, oldest first.",
	get_ticket_stats:
		"Get aggregate helpdesk stats: totals by status, AI-resolved counts, and recent volume.",
	reply_to_ticket:
		"Post a public reply on a ticket. The reply is EMAILED to the customer verbatim — only call this after the staff member has explicitly confirmed the exact draft.",
};

type AssistantUser = { name: string; role: string };

function buildPreamble(
	surface: "voice" | "chat",
	user: AssistantUser,
): string[] {
	return [
		`You are the ${surface === "voice" ? "voice" : "chat"} assistant for a helpdesk console. You are ${surface === "voice" ? "speaking" : "chatting"} with ${user.name} (${user.role}), a signed-in support staff member.`,
		"Answer questions about tickets using the provided tools. You can read tickets and post public replies. You cannot change a ticket's status, assignee, or category, and you cannot delete anything — for those, point to the helpdesk UI.",
		"Replying to a ticket EMAILS the customer. Before calling reply_to_ticket you MUST show the staff member the exact draft text and get their explicit confirmation (e.g. \"yes, send it\") in this conversation. Never send a reply unprompted, and never alter a confirmed draft before sending.",
	];
}

function buildDomainNotes(knowledgeBase: string): string[] {
	return [
		"Ticket statuses are OPEN, RESOLVED, and CLOSED. Tickets in NEW or PROCESSING are still being auto-triaged by the AI worker and are hidden from staff. Categories are GENERAL_QUESTION, TECHNICAL_QUESTION, and REFUND_REQUEST.",
		"",
		"Company knowledge base (for product and policy questions):",
		"```",
		knowledgeBase,
		"```",
	];
}

export function buildVoiceInstructions(
	user: AssistantUser,
	knowledgeBase: string,
): string {
	return [
		...buildPreamble("voice", user),
		"Keep spoken answers short and conversational. Summarize lists (counts plus a few highlights) instead of reading every field. Never read out raw ids unless asked.",
		...buildDomainNotes(knowledgeBase),
	].join("\n");
}

export function buildChatInstructions(
	user: AssistantUser,
	knowledgeBase: string,
): string {
	return [
		...buildPreamble("chat", user),
		"Keep written answers concise. Tool results are rendered as rich cards in the chat UI automatically, so don't repeat full ticket lists or every field in prose — give a one-line takeaway and refer to the card. Never dump raw ids unless asked.",
		...buildDomainNotes(knowledgeBase),
	].join("\n");
}
