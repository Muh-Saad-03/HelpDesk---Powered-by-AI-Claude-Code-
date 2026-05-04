/** @format */

import { PgBoss, type Job } from "pg-boss";
import { classifyTicketCategory } from "./ai.ts";
import { prisma } from "./db.ts";

const CLASSIFY_QUEUE = "classify-ticket";

type ClassifyJob = { ticketId: string };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

export const boss = new PgBoss(connectionString);

boss.on("error", (err: Error) => {
	console.error("pg-boss error:", err);
});

export async function enqueueClassify(ticketId: string): Promise<void> {
	await boss.send(CLASSIFY_QUEUE, { ticketId } satisfies ClassifyJob);
}

export async function startQueue(): Promise<void> {
	await boss.start();
	await boss.createQueue(CLASSIFY_QUEUE);

	await boss.work<ClassifyJob>(
		CLASSIFY_QUEUE,
		{ batchSize: 1, pollingIntervalSeconds: 2 },
		async ([job]: Job<ClassifyJob>[]) => {
			if (!job) return;
			const { ticketId } = job.data;

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
		},
	);

	console.log(`pg-boss started; worker registered for "${CLASSIFY_QUEUE}"`);
}

export async function stopQueue(): Promise<void> {
	await boss.stop({ graceful: true, timeout: 5000 });
}
