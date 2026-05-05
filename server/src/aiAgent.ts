/** @format */

import { prisma } from "./db.ts";

// Sentinel identity for the system AI agent. Created by db:seed and looked
// up here by the inbound webhook (to assign new tickets) and the auto-resolve
// worker (to unassign on failure). The user has no Account row, so nobody
// can authenticate as it.
export const AI_AGENT_EMAIL = "ai@helpdesk.local";
export const AI_AGENT_NAME = "AI";

let cachedId: string | null = null;

// Memoizes the lookup so we don't pay a DB round-trip on every inbound
// ticket. Returns null only when the seed hasn't run yet — once found, the
// id is cached for the process lifetime.
export async function getAiAgentId(): Promise<string | null> {
	if (cachedId !== null) return cachedId;
	const u = await prisma.user.findUnique({
		where: { email: AI_AGENT_EMAIL },
		select: { id: true },
	});
	if (u) cachedId = u.id;
	return u?.id ?? null;
}
