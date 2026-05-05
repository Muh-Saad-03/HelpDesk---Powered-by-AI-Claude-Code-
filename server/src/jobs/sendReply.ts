/** @format */

import type { Job, PgBoss } from "pg-boss";
import { SenderType } from "core";
import { prisma } from "../db.ts";
import { sendReplyEmail } from "../email-out.ts";

export const SEND_REPLY_QUEUE = "send-reply-email";

type SendReplyJob = { replyId: string };

export async function enqueueSendReply(
	boss: PgBoss,
	replyId: string,
): Promise<void> {
	await boss.send(SEND_REPLY_QUEUE, { replyId } satisfies SendReplyJob);
}

export async function registerSendReplyWorker(boss: PgBoss): Promise<void> {
	await boss.createQueue(SEND_REPLY_QUEUE);
	await boss.work<SendReplyJob>(
		SEND_REPLY_QUEUE,
		{ batchSize: 1, pollingIntervalSeconds: 2 },
		async ([job]: Job<SendReplyJob>[]) => {
			if (!job) return;
			await runSendReply(job.data.replyId);
		},
	);
}

// Emails an AGENT-typed reply to the ticket's `fromEmail`. Skips silently
// if the reply has been deleted or isn't AGENT-authored — pg-boss treats
// returning normally as success, so neither case retries.
async function runSendReply(replyId: string): Promise<void> {
	const reply = await prisma.reply.findUnique({
		where: { id: replyId },
		select: {
			body: true,
			senderType: true,
			ticket: {
				select: {
					subject: true,
					fromEmail: true,
					fromName: true,
				},
			},
		},
	});
	if (!reply) return;
	if (reply.senderType !== SenderType.AGENT) return;

	await sendReplyEmail({
		to: reply.ticket.fromEmail,
		toName: reply.ticket.fromName,
		subject: reply.ticket.subject,
		body: reply.body,
	});
}
