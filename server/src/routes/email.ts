/** @format */

import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { TicketStatus, inboundEmailSchema } from "core";
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

function isBounceSender(fromEmail: string): boolean {
	const local = fromEmail.split("@")[0]?.toLowerCase() ?? "";
	return local === "mailer-daemon" || local === "postmaster";
}

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
	const { fromEmail, fromName, subject, body } = parsed.data;

	if (isBounceSender(fromEmail)) {
		res.status(200).json({ ok: true, skipped: "bounce" });
		return;
	}

	const ticket = await prisma.ticket.create({
		data: {
			subject: subject.trim() === "" ? "(no subject)" : subject,
			body,
			fromEmail,
			fromName: fromName ?? null,
			status: TicketStatus.NEW,
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

	res.status(201).json({ ticket });
});
