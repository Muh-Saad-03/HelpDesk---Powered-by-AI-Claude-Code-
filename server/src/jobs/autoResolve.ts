/** @format */

import type { Job, PgBoss } from "pg-boss";
import { SenderType, TicketStatus } from "core";
import { autoResolveTicket } from "../ai.ts";
import { prisma } from "../db.ts";
import { loadKnowledgeBase } from "../knowledge-base.ts";

export const AUTO_RESOLVE_QUEUE = "auto-resolve-ticket";

type AutoResolveJob = { ticketId: string };

export async function enqueueAutoResolve(
	boss: PgBoss,
	ticketId: string,
): Promise<void> {
	await boss.send(AUTO_RESOLVE_QUEUE, { ticketId } satisfies AutoResolveJob);
}

export async function registerAutoResolveWorker(boss: PgBoss): Promise<void> {
	await boss.createQueue(AUTO_RESOLVE_QUEUE);
	await boss.work<AutoResolveJob>(
		AUTO_RESOLVE_QUEUE,
		{ batchSize: 1, pollingIntervalSeconds: 2 },
		async ([job]: Job<AutoResolveJob>[]) => {
			if (!job) return;
			await runAutoResolve(job.data.ticketId);
		},
	);
}

// Drives a ticket from NEW → PROCESSING → (RESOLVED | OPEN). The terminal
// state is always set, even on LLM failure, so a stuck ticket can't sit in
// PROCESSING forever and disappear from the agent list.
async function runAutoResolve(ticketId: string): Promise<void> {
	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId },
		select: {
			id: true,
			subject: true,
			body: true,
			fromName: true,
			fromEmail: true,
			status: true,
		},
	});
	if (!ticket) return;
	// Idempotency: only NEW tickets are eligible. If the worker already moved
	// it (e.g. on a duplicate enqueue or a retry after a crash), skip.
	if (ticket.status !== TicketStatus.NEW) return;

	await prisma.ticket.update({
		where: { id: ticketId },
		data: { status: TicketStatus.PROCESSING },
		select: { id: true },
	});

	try {
		const knowledgeBase = await loadKnowledgeBase();
		const result = await autoResolveTicket({
			subject: ticket.subject,
			customerName: ticket.fromName,
			customerEmail: ticket.fromEmail,
			body: ticket.body,
			knowledgeBase,
		});

		if (result.canResolve) {
			// Post the AI reply as an AGENT-typed reply with no authorId — the
			// `Reply.author` relation is already nullable, so a missing author
			// is the marker for "system / AI" replies.
			await prisma.$transaction([
				prisma.reply.create({
					data: {
						ticketId,
						senderType: SenderType.AGENT,
						authorId: null,
						body: result.reply,
					},
					select: { id: true },
				}),
				prisma.ticket.update({
					where: { id: ticketId },
					data: { status: TicketStatus.RESOLVED },
					select: { id: true },
				}),
			]);
		} else {
			// AI gave up — release the ticket to a human by clearing the AI
			// assignee alongside the status flip. (Inbound assigns every new
			// ticket to the AI agent so PROCESSING tickets show ownership.)
			await prisma.ticket.update({
				where: { id: ticketId },
				data: { status: TicketStatus.OPEN, assigneeId: null },
				select: { id: true },
			});
		}
	} catch (err) {
		// LLM failed (rate-limit, network, schema validation). Surface the
		// ticket to a human rather than leaving it stuck in PROCESSING, and
		// drop the AI assignment so the ticket reads as truly unowned.
		await prisma.ticket.update({
			where: { id: ticketId },
			data: { status: TicketStatus.OPEN, assigneeId: null },
			select: { id: true },
		});
		throw err;
	}
}
