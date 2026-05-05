/** @format */

import sgMail from "@sendgrid/mail";

// Lazy init — sgMail.setApiKey throws if called with undefined, and we
// don't want the server to fail to boot just because SENDGRID_API_KEY
// hasn't been set in dev. Instead the first send() call will surface
// the misconfiguration as a job failure (which pg-boss retries + logs).
let initialized = false;
function init(): { fromEmail: string; fromName: string } {
	const apiKey = process.env.SENDGRID_API_KEY;
	const fromEmail = process.env.OUTBOUND_FROM_EMAIL;
	const fromName = process.env.OUTBOUND_FROM_NAME ?? "Helpdesk";
	if (!apiKey) {
		throw new Error("SENDGRID_API_KEY is not configured");
	}
	if (!fromEmail) {
		throw new Error("OUTBOUND_FROM_EMAIL is not configured");
	}
	if (!initialized) {
		sgMail.setApiKey(apiKey);
		initialized = true;
	}
	return { fromEmail, fromName };
}

// Most subjects already have one "Re:" prefix from the customer's reply
// chain. Don't stack them — gmail and outlook collapse multiple anyway,
// but the threading heuristics are cleaner with a single prefix.
function withReplyPrefix(subject: string): string {
	const trimmed = subject.trim();
	if (/^re:/i.test(trimmed)) return trimmed;
	return `Re: ${trimmed}`;
}

export type SendReplyInput = {
	to: string;
	toName?: string | null;
	subject: string;
	body: string;
};

export async function sendReplyEmail(input: SendReplyInput): Promise<void> {
	const { fromEmail, fromName } = init();
	await sgMail.send({
		to: input.toName ? { email: input.to, name: input.toName } : input.to,
		from: { email: fromEmail, name: fromName },
		// replyTo matches the inbound parse address so a customer's reply
		// loops back into the webhook and creates a new ticket. (Threading
		// onto the existing ticket needs Message-Id storage — see follow-up.)
		replyTo: { email: fromEmail, name: fromName },
		subject: withReplyPrefix(input.subject),
		text: input.body,
	});
}
