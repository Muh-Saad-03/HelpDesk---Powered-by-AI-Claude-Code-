/** @format */

import { z } from "zod";
import { VOICE_TOOL_SCHEMAS, type VoiceToolName } from "core";
import { loadKnowledgeBase } from "./knowledge-base.ts";

const REALTIME_MODEL = "gpt-realtime-2";
const OUTPUT_VOICE = "marin";
const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

const TOOL_DESCRIPTIONS: Record<VoiceToolName, string> = {
	search_tickets:
		"Search and list helpdesk tickets. Returns one page of matching tickets plus the total count.",
	get_ticket:
		"Get full detail for one ticket by id: subject, body, status, category, customer, assignee, timestamps.",
	get_ticket_replies:
		"Get the conversation history (replies) for a ticket, oldest first.",
	get_ticket_stats:
		"Get aggregate helpdesk stats: totals by status, AI-resolved counts, and recent volume.",
};

function buildTools() {
	return (Object.keys(VOICE_TOOL_SCHEMAS) as VoiceToolName[]).map((name) => ({
		type: "function" as const,
		name,
		description: TOOL_DESCRIPTIONS[name],
		parameters: z.toJSONSchema(VOICE_TOOL_SCHEMAS[name]),
	}));
}

function buildInstructions(
	user: { name: string; role: string },
	knowledgeBase: string,
): string {
	return [
		`You are the voice assistant for a helpdesk console. You are speaking with ${user.name} (${user.role}), a signed-in support staff member.`,
		"Answer questions about tickets using the provided tools. Your access is READ-ONLY — you cannot modify, assign, reply to, or close tickets. If asked to change anything, say you can't and suggest doing it in the helpdesk UI.",
		"Keep spoken answers short and conversational. Summarize lists (counts plus a few highlights) instead of reading every field. Never read out raw ids unless asked.",
		"Ticket statuses are OPEN, RESOLVED, and CLOSED. Tickets in NEW or PROCESSING are still being auto-triaged by the AI worker and are hidden from staff. Categories are GENERAL_QUESTION, TECHNICAL_QUESTION, and REFUND_REQUEST.",
		"",
		"Company knowledge base (for product and policy questions):",
		"```",
		knowledgeBase,
		"```",
	].join("\n");
}

export type VoiceSession = {
	value: string;
	expiresAt: number;
};

export async function mintVoiceSession(user: {
	name: string;
	role: string;
}): Promise<VoiceSession> {
	const knowledgeBase = await loadKnowledgeBase();
	const res = await fetch(CLIENT_SECRETS_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			session: {
				type: "realtime",
				model: REALTIME_MODEL,
				instructions: buildInstructions(user, knowledgeBase),
				audio: {
					input: { transcription: { model: "gpt-4o-mini-transcribe" } },
					output: { voice: OUTPUT_VOICE },
				},
				tools: buildTools(),
			},
		}),
	});
	if (!res.ok) {
		throw new Error(
			`OpenAI client_secrets request failed: ${res.status} ${await res.text()}`,
		);
	}
	const data = (await res.json()) as { value: string; expires_at: number };
	return { value: data.value, expiresAt: data.expires_at };
}
