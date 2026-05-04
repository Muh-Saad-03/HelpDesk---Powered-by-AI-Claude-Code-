/** @format */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { SenderType } from "core";

const POLISH_SYSTEM_PROMPT = `You are a customer support agent's writing assistant.
You will be given a support ticket: the subject, the customer's original message,
the conversation history so far, and the agent's draft reply. Your job is to
rewrite the agent's draft into a short reply that directly addresses the
customer's situation given the full context.

Rules:
- Output MUST be 2 to 3 sentences. Never more. No bullet points, no lists.
- Treat the agent's draft as their intent. Ground it in the ticket and history
  so the reply actually answers the customer.
- Clear, professional, friendly. No filler.
- Do not invent facts, policies, prices, dates, or commitments that are not in
  the ticket, history, or draft.
- Open with "Dear {first name}," using only the customer's first name when
  one is provided. If no name is provided, open with "Hello,".
- Do not add a sign-off, signature, or closing line — a signature is appended
  automatically; if you add one, it will be duplicated.
- The 2–3 sentence limit applies to the body (excluding the greeting line).
- Reply in the same language the customer is writing in.
- Return only the rewritten reply text — no preamble, no quotes, no markdown
  fences, no labels like "Reply:".`;

export type PolishHistoryItem = {
	senderType: SenderType;
	authorName: string | null;
	body: string;
};

export type PolishContext = {
	subject: string;
	customerName: string | null;
	customerEmail: string;
	originalMessage: string;
	history: PolishHistoryItem[];
	draft: string;
	agentName: string;
};

function formatCustomer(ctx: {
	customerName: string | null;
	customerEmail: string;
}): string {
	return ctx.customerName ?
			`${ctx.customerName} <${ctx.customerEmail}>`
		:	ctx.customerEmail;
}

function formatHistory(history: PolishHistoryItem[]): string {
	if (history.length === 0) return "(no replies yet)";
	return history
		.map((item) => {
			const who =
				item.senderType === SenderType.AGENT ?
					`Agent${item.authorName ? ` (${item.authorName})` : ""}`
				:	"Customer";
			return `--- ${who} ---\n${item.body}`;
		})
		.join("\n\n");
}

function buildUserPrompt(ctx: PolishContext): string {
	return [
		`Subject: ${ctx.subject}`,
		`Customer: ${formatCustomer(ctx)}`,
		"",
		"Customer's original message:",
		ctx.originalMessage,
		"",
		"Conversation history (oldest first):",
		formatHistory(ctx.history),
		"",
		"Agent's draft reply:",
		ctx.draft,
		"",
		"Rewrite the agent's draft into a polished reply to the customer.",
	].join("\n");
}

export async function polishReplyText(ctx: PolishContext): Promise<string> {
	const { text } = await generateText({
		model: openai("gpt-5-nano"),
		system: POLISH_SYSTEM_PROMPT,
		prompt: buildUserPrompt(ctx),
		providerOptions: {
			openai: { reasoningEffort: "low" },
		},
	});
	return `${text.trim()}\n\nBest regards,\n${ctx.agentName}\nSaad.com`;
}

const SUMMARIZE_SYSTEM_PROMPT = `You are a customer support assistant. You will
be given a support ticket and the conversation history between the customer and
the agents. Produce a concise summary an agent can read in a few seconds to
catch up.

Rules:
- 3 to 5 short sentences. No bullet points, no headings, no markdown.
- Cover: what the customer is asking for, key facts/details from the
  conversation, what has been tried or promised, and the current state
  (e.g. waiting on customer, waiting on agent, resolved).
- Stay grounded in the provided text. Do not invent facts, prices, dates,
  policies, or commitments that are not present.
- Neutral, professional tone. Refer to the customer as "the customer" rather
  than by name.
- Return only the summary text — no preamble, no quotes, no labels.`;

export type SummarizeContext = {
	subject: string;
	customerName: string | null;
	customerEmail: string;
	originalMessage: string;
	history: PolishHistoryItem[];
};

function buildSummarizePrompt(ctx: SummarizeContext): string {
	return [
		`Subject: ${ctx.subject}`,
		`Customer: ${formatCustomer(ctx)}`,
		"",
		"Customer's original message:",
		ctx.originalMessage,
		"",
		"Conversation history (oldest first):",
		formatHistory(ctx.history),
		"",
		"Summarize the ticket and conversation for an agent picking it up.",
	].join("\n");
}

export async function summarizeTicketText(
	ctx: SummarizeContext,
): Promise<string> {
	const { text } = await generateText({
		model: openai("gpt-5-nano"),
		system: SUMMARIZE_SYSTEM_PROMPT,
		prompt: buildSummarizePrompt(ctx),
		providerOptions: {
			openai: { reasoningEffort: "low" },
		},
	});
	return text.trim();
}
