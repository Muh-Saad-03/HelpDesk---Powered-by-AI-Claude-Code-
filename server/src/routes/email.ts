/** @format */

import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import multer from "multer";
import Parse from "@sendgrid/inbound-mail-parser";
import {
	TicketStatus,
	inboundEmailSchema,
	type InboundEmailInput,
} from "core";
import { AI_AGENT_EMAIL, getAiAgentId } from "../aiAgent.ts";
import { prisma } from "../db.ts";
import { enqueueAutoResolve, enqueueClassify } from "../queue.ts";

function firstIssueMessage(issues: readonly { message: string }[]): string {
	return issues[0]?.message ?? "Invalid input";
}

// Constant-time comparison of the X-Webhook-Secret header against the
// configured secret. Throws on mis-config so the global error middleware
// surfaces it as a 500 — that's a server fault, not a client one.
function hasValidSecret(provided: string | undefined): boolean {
	const expected = process.env.INBOUND_EMAIL_SECRET;
	if (!expected) {
		throw new Error("INBOUND_EMAIL_SECRET is not configured");
	}
	if (typeof provided !== "string") return false;
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

// Constant-time string equality via timingSafeEqual. Returns false when
// lengths differ (timingSafeEqual itself requires equal-length buffers).
function constantTimeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ba.length !== bb.length) return false;
	return timingSafeEqual(ba, bb);
}

// Validates an HTTP Basic Auth header against SENDGRID_INBOUND_USER /
// SENDGRID_INBOUND_PASSWORD. SendGrid sends these creds when the Inbound
// Parse URL is configured as `https://user:pass@host/path`.
function hasValidBasicAuth(header: string | undefined): boolean {
	const expectedUser = process.env.SENDGRID_INBOUND_USER;
	const expectedPass = process.env.SENDGRID_INBOUND_PASSWORD;
	if (!expectedUser || !expectedPass) {
		throw new Error(
			"SENDGRID_INBOUND_USER and SENDGRID_INBOUND_PASSWORD must be configured",
		);
	}
	if (typeof header !== "string" || !header.startsWith("Basic ")) return false;
	const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
	const colon = decoded.indexOf(":");
	if (colon < 0) return false;
	const user = decoded.slice(0, colon);
	const pass = decoded.slice(colon + 1);
	return (
		constantTimeEqual(user, expectedUser) &&
		constantTimeEqual(pass, expectedPass)
	);
}

function isBounceSender(fromEmail: string): boolean {
	const local = fromEmail.split("@")[0]?.toLowerCase() ?? "";
	return local === "mailer-daemon" || local === "postmaster";
}

// Parses an RFC 5322 From header into name + email. Handles the three
// common forms SendGrid emits: bare address, `Name <addr>`, `"Name" <addr>`.
function parseFromHeader(raw: string): {
	fromEmail: string;
	fromName: string | undefined;
} {
	const angle = raw.match(/^\s*"?([^"<>]*?)"?\s*<([^>]+)>\s*$/);
	if (angle && angle[2]) {
		const name = (angle[1] ?? "").trim();
		return { fromEmail: angle[2].trim(), fromName: name || undefined };
	}
	return { fromEmail: raw.trim(), fromName: undefined };
}

// Picks the best body representation from a SendGrid Parse payload. Prefer
// the plain-text part; fall back to a crude HTML strip for HTML-only emails
// (most marketing newsletters). Truncated to the schema's 2000-char limit
// so the schema doesn't reject otherwise-valid mail.
function bodyFromSendgrid(
	text: string | undefined,
	html: string | undefined,
): string {
	const MAX = 2000;
	if (text && text.trim().length > 0) return text.trim().slice(0, MAX);
	if (html && html.trim().length > 0) {
		return html
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, MAX);
	}
	return "";
}

// Shared "create ticket + enqueue jobs" path. Both inbound routes (the
// generic JSON one and the SendGrid multipart adapter) normalize their
// payload to InboundEmailInput, then call this. Returns null on bounce
// senders so callers can respond 200 with a skipped reason.
async function createInboundTicket(
	input: InboundEmailInput,
): Promise<{ id: string } | null> {
	if (isBounceSender(input.fromEmail)) return null;

	// Assign new tickets to the AI agent up front. The auto-resolve worker
	// will keep the assignment on success (RESOLVED) and clear it on failure
	// (OPEN), so the assignee always reflects who currently owns the ticket.
	const aiAgentId = await getAiAgentId();
	if (!aiAgentId) {
		console.warn(
			`AI agent (${AI_AGENT_EMAIL}) not found — creating ticket unassigned. Run "bun run db:seed" to create it.`,
		);
	}

	const ticket = await prisma.ticket.create({
		data: {
			subject: input.subject.trim() === "" ? "(no subject)" : input.subject,
			body: input.body,
			fromEmail: input.fromEmail,
			fromName: input.fromName ?? null,
			status: TicketStatus.NEW,
			assigneeId: aiAgentId,
		},
		select: { id: true },
	});

	// Run two jobs out-of-band on pg-boss: classification fills in
	// `ticket.category`, and auto-resolve consults the KB and either posts a
	// reply + marks the ticket RESOLVED, or releases it to OPEN. The webhook
	// returns 201 immediately; the ticket stays hidden from the agent list
	// while it's still in NEW/PROCESSING.
	await Promise.all([
		enqueueClassify(ticket.id),
		enqueueAutoResolve(ticket.id),
	]);

	return ticket;
}

// Multer instance for the SendGrid route. `.any()` accepts every field
// (text and file) without complaining about unexpected names — Inbound
// Parse posts attachments + attachment-info alongside the email fields.
// We don't read attachments yet, but we shouldn't reject the request just
// because they're present.
const sendgridUpload = multer({
	limits: { fileSize: 10 * 1024 * 1024, files: 20 },
});

export const emailRouter = Router();

// Unauthenticated by Better Auth session — gated by a shared secret instead
// because this is called by an external email-provider webhook, not a user.
emailRouter.post("/inbound", async (req: Request, res: Response) => {
	if (!hasValidSecret(req.header("X-Webhook-Secret"))) {
		res.status(401).end();
		return;
	}

	const parsed = inboundEmailSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
		return;
	}

	const ticket = await createInboundTicket(parsed.data);
	if (!ticket) {
		res.status(200).json({ ok: true, skipped: "bounce" });
		return;
	}
	res.status(201).json({ ticket });
});

// SendGrid Inbound Parse adapter. Configure the Parse URL in SendGrid as
// `https://USER:PASS@<host>/api/email/inbound/sendgrid` — SendGrid strips
// the credentials off the URL and re-sends them as an `Authorization: Basic`
// header. The body is multipart/form-data with `from`, `subject`, `text`,
// `html`, `attachments`, `attachment-info`, etc. We map it to our internal
// InboundEmailInput shape and reuse the same downstream pipeline.
emailRouter.post(
	"/inbound/sendgrid",
	sendgridUpload.any(),
	async (req: Request, res: Response) => {
		if (!hasValidBasicAuth(req.header("Authorization"))) {
			res.set("WWW-Authenticate", 'Basic realm="sendgrid-inbound"');
			res.status(401).end();
			return;
		}

		// Hand the raw multipart payload to SendGrid's official parser. It
		// pulls each requested key out of req.body and exposes a clean
		// keyValues() map; we still need parseFromHeader / bodyFromSendgrid
		// because the parser doesn't split addresses or pick text-vs-html.
		const parser = new Parse(
			{ keys: ["from", "subject", "text", "html"] },
			{ body: req.body, files: Array.isArray(req.files) ? req.files : [] },
		);
		const data = parser.keyValues();

		const fromRaw = typeof data.from === "string" ? data.from : "";
		const subjectRaw = typeof data.subject === "string" ? data.subject : "";
		const text = typeof data.text === "string" ? data.text : undefined;
		const html = typeof data.html === "string" ? data.html : undefined;

		const { fromEmail, fromName } = parseFromHeader(fromRaw);
		const candidate: unknown = {
			fromEmail,
			...(fromName ? { fromName } : {}),
			subject: subjectRaw.slice(0, 255),
			body: bodyFromSendgrid(text, html),
		};

		const parsed = inboundEmailSchema.safeParse(candidate);
		if (!parsed.success) {
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
			return;
		}

		const ticket = await createInboundTicket(parsed.data);
		if (!ticket) {
			res.status(200).json({ ok: true, skipped: "bounce" });
			return;
		}
		res.status(201).json({ ticket });
	},
);
