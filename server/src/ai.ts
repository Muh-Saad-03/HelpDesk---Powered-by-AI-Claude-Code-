/** @format */

import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { SenderType, TicketCategory } from "core";

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

const CLASSIFY_SYSTEM_PROMPT = `You classify customer support tickets into one
of three categories. Read the subject and body and choose the single best fit.

Categories:
- GENERAL_QUESTION — questions about the product, company, account, billing
  details, how-to inquiries, or anything that doesn't fit the other two.
- TECHNICAL_QUESTION — bug reports, errors, crashes, broken features,
  integration issues, or anything where the customer needs technical help.
- REFUND_REQUEST — the customer is asking for a refund, a chargeback, to
  cancel and be reimbursed, or otherwise wants their money back.

Pick exactly one. If the ticket is mixed, pick the category that best matches
the customer's primary intent.`;

export type ClassifyContext = {
	subject: string;
	body: string;
};

export async function classifyTicketCategory(
	ctx: ClassifyContext,
): Promise<TicketCategory> {
	const { object } = await generateObject({
		model: openai("gpt-5-nano"),
		output: "enum",
		enum: [
			TicketCategory.GENERAL_QUESTION,
			TicketCategory.TECHNICAL_QUESTION,
			TicketCategory.REFUND_REQUEST,
		],
		system: CLASSIFY_SYSTEM_PROMPT,
		prompt: [`Subject: ${ctx.subject}`, "", "Body:", ctx.body].join("\n"),
		providerOptions: {
			openai: { reasoningEffort: "low" },
		},
	});
	return object as TicketCategory;
}

const AUTO_RESOLVE_SYSTEM_PROMPT = `You are an automated first-line support
agent. You will be given a customer's ticket and a knowledge base. Decide
whether the ticket can be fully and confidently resolved using ONLY the
information in the knowledge base, and if so, write the customer reply.

Output:
- canResolve: true ONLY if the knowledge base directly answers the customer's
  specific question and you can produce a complete, accurate reply from it.
  false otherwise.
- reply: when canResolve is true, the full customer-facing reply text. When
  canResolve is false, return an empty string.

Hard rules — set canResolve to false (escalate to a human) when ANY of these
apply, even if the KB seems related:
- The knowledge base has an "Escalation Rules" section; obey it. In particular,
  escalate on: legal threats, refund requests outside the policy window,
  chargeback or payment-dispute mentions, account security concerns, or any
  case where confidence is low.
- The customer is asking for a human action (account changes, manual refund,
  email-address changes, etc.) that requires staff.
- The KB doesn't directly cover the situation, or you'd need to guess.
- The ticket is ambiguous, mixed-intent, or needs clarifying questions.

Reply style (when canResolve is true):
- Open with "Dear {first name}," using ONLY the customer's first name. If the
  customer's full name has multiple words, use the first one only (e.g. for
  "Alice Cooper" write "Dear Alice,"). If no name is provided, open with
  "Hello,".
- Leave a blank line after the greeting, between paragraphs, and before the
  sign-off. Keep paragraphs short (1–3 sentences).
- Acknowledge what the customer asked in the first sentence so the reply
  doesn't read like a form letter.
- When the answer is procedural (multiple steps), use a numbered list with
  each step on its own line ("1. ...", "2. ..."). When it's a single piece
  of information, use plain prose. Never use markdown headings, bold, or
  bullet symbols ("-", "*").
- Total length: 2 to 6 short sentences (or up to ~6 numbered steps for
  procedural answers). No filler, no apologies for things that don't apply.
- Ground every claim in the knowledge base. Do not invent policies, prices,
  dates, links, contact addresses, or commitments.
- Tone: warm, professional, customer-friendly. Plain English. No jargon. Do
  not refer to yourself as an AI or to the knowledge base.
- Reply in the same language the customer is writing in.
- End with exactly two lines: "Best regards," on one line, then
  "Saad Support" on the next. Nothing after that — no extra signature,
  contact info, or disclaimer.`;

export type AutoResolveContext = {
	subject: string;
	customerName: string | null;
	customerEmail: string;
	body: string;
	knowledgeBase: string;
};

export type AutoResolveResult = {
	canResolve: boolean;
	reply: string;
};

const autoResolveSchema = z.object({
	canResolve: z
		.boolean()
		.describe(
			"True only if the knowledge base directly resolves the ticket and you have produced a complete reply. False otherwise.",
		),
	reply: z
		.string()
		.describe(
			"The full customer-facing reply text when canResolve is true, otherwise an empty string.",
		),
});

function buildAutoResolvePrompt(ctx: AutoResolveContext): string {
	return [
		"Knowledge base:",
		"```",
		ctx.knowledgeBase,
		"```",
		"",
		`Subject: ${ctx.subject}`,
		`Customer: ${formatCustomer(ctx)}`,
		"",
		"Customer's message:",
		ctx.body,
		"",
		"Decide whether you can resolve this ticket from the knowledge base alone, and if so, write the reply.",
	].join("\n");
}

export async function autoResolveTicket(
	ctx: AutoResolveContext,
): Promise<AutoResolveResult> {
	const { object } = await generateObject({
		model: openai("gpt-5-nano"),
		schema: autoResolveSchema,
		system: AUTO_RESOLVE_SYSTEM_PROMPT,
		prompt: buildAutoResolvePrompt(ctx),
		providerOptions: {
			openai: { reasoningEffort: "low" },
		},
	});
	return {
		canResolve: object.canResolve && object.reply.trim().length > 0,
		reply: object.reply.trim(),
	};
}
