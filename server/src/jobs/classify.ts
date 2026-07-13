/** @format */

import type { Job, PgBoss } from "pg-boss";
import * as Sentry from "@sentry/bun";
import { classifyTicketCategory } from "../ai.ts";
import { prisma } from "../db.ts";

export const CLASSIFY_QUEUE = "classify-ticket";

type ClassifyJob = { ticketId: string };

export async function enqueueClassify(
	boss: PgBoss,
	ticketId: string,
): Promise<void> {
	await boss.send(CLASSIFY_QUEUE, { ticketId } satisfies ClassifyJob);
}

export async function registerClassifyWorker(boss: PgBoss): Promise<void> {
	await boss.createQueue(CLASSIFY_QUEUE);
	await boss.work<ClassifyJob>(
		CLASSIFY_QUEUE,
		{ batchSize: 1, pollingIntervalSeconds: 2 },
		async ([job]: Job<ClassifyJob>[]) => {
			if (!job) return;
			try {
				await runClassify(job.data.ticketId);
			} catch (err) {
				console.error(
					`[${CLASSIFY_QUEUE}] job failed (ticketId=${job.data.ticketId}):`,
					err,
				);
				Sentry.captureException(err, {
					tags: { queue: CLASSIFY_QUEUE },
					extra: { ticketId: job.data.ticketId },
				});
				throw err;
			}
		},
	);
}

async function runClassify(ticketId: string): Promise<void> {
	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId },
		select: { subject: true, body: true },
	});
	// Ticket may have been deleted between enqueue and pickup — treat as
	// a no-op success so pg-boss doesn't retry indefinitely.
	if (!ticket) return;

	const category = await classifyTicketCategory({
		subject: ticket.subject,
		body: ticket.body,
	});

	await prisma.ticket.update({
		where: { id: ticketId },
		data: { category },
		select: { id: true },
	});
}
