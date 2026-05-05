/** @format */

import { PgBoss } from "pg-boss";
import {
	enqueueAutoResolve as enqueueAutoResolveJob,
	registerAutoResolveWorker,
} from "./jobs/autoResolve.ts";
import {
	enqueueClassify as enqueueClassifyJob,
	registerClassifyWorker,
} from "./jobs/classify.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

export const boss = new PgBoss(connectionString);

boss.on("error", (err: Error) => {
	console.error("pg-boss error:", err);
});

// Thin wrappers so callers don't have to thread the singleton boss through
// every site. Each job module stays pg-boss-instance-agnostic, which makes
// it trivial to test in isolation.
export const enqueueClassify = (ticketId: string): Promise<void> =>
	enqueueClassifyJob(boss, ticketId);
export const enqueueAutoResolve = (ticketId: string): Promise<void> =>
	enqueueAutoResolveJob(boss, ticketId);

export async function startQueue(): Promise<void> {
	await boss.start();
	await Promise.all([
		registerClassifyWorker(boss),
		registerAutoResolveWorker(boss),
	]);
	console.log("pg-boss started; classify + auto-resolve workers registered");
}

export async function stopQueue(): Promise<void> {
	await boss.stop({ graceful: true, timeout: 5000 });
}
