/** @format */

import { PgBoss } from "pg-boss";
import * as Sentry from "@sentry/bun";
import {
	enqueueAutoResolve as enqueueAutoResolveJob,
	registerAutoResolveWorker,
} from "./jobs/autoResolve.ts";
import {
	enqueueClassify as enqueueClassifyJob,
	registerClassifyWorker,
} from "./jobs/classify.ts";
import {
	enqueueSendReply as enqueueSendReplyJob,
	registerSendReplyWorker,
} from "./jobs/sendReply.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

export const boss = new PgBoss(connectionString);

boss.on("error", (err: Error) => {
	console.error("pg-boss error:", err);
	Sentry.captureException(err, { tags: { source: "pg-boss" } });
});

// Thin wrappers so callers don't have to thread the singleton boss through
// every site. Each job module stays pg-boss-instance-agnostic, which makes
// it trivial to test in isolation.
export const enqueueClassify = (ticketId: string): Promise<void> =>
	enqueueClassifyJob(boss, ticketId);
export const enqueueAutoResolve = (ticketId: string): Promise<void> =>
	enqueueAutoResolveJob(boss, ticketId);
export const enqueueSendReply = (replyId: string): Promise<void> =>
	enqueueSendReplyJob(boss, replyId);

export async function startQueue(): Promise<void> {
	await boss.start();
	await Promise.all([
		registerClassifyWorker(boss),
		registerAutoResolveWorker(boss),
		registerSendReplyWorker(boss),
	]);
	console.log(
		"pg-boss started; classify + auto-resolve + send-reply workers registered",
	);
}

export async function stopQueue(): Promise<void> {
	await boss.stop({ graceful: true, timeout: 5000 });
}
