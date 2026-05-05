import { Role } from "core";
import { auth } from "./auth.ts";
import { prisma } from "./db.ts";
import { AI_AGENT_EMAIL, AI_AGENT_NAME } from "./aiAgent.ts";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "Admin";

if (!email || !password) {
	console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
	process.exit(1);
}

async function upsertUser(opts: {
	email: string;
	// Omit to create a no-login user (no Account row) — used for system
	// users like the AI agent that should never authenticate.
	password?: string;
	name: string;
	role: Role;
}) {
	const existing = await prisma.user.findUnique({ where: { email: opts.email } });

	if (existing) {
		if (existing.role !== opts.role) {
			await prisma.user.update({
				where: { id: existing.id },
				data: { role: opts.role },
			});
			console.log(`Promoted existing user ${opts.email} to ${opts.role}`);
		} else {
			console.log(`User already exists: ${opts.email} (${opts.role})`);
		}
		return;
	}

	const userId = crypto.randomUUID();

	const accountsCreate = opts.password
		? {
				create: {
					id: crypto.randomUUID(),
					accountId: userId,
					providerId: "credential",
					password: await (await auth.$context).password.hash(opts.password),
				},
			}
		: undefined;

	await prisma.user.create({
		data: {
			id: userId,
			email: opts.email,
			name: opts.name,
			emailVerified: false,
			role: opts.role,
			...(accountsCreate ? { accounts: accountsCreate } : {}),
		},
	});

	console.log(`Created ${opts.role} user: ${opts.email}`);
}

await upsertUser({ email, password, name, role: Role.ADMIN });

// AI agent: the system identity new tickets are assigned to while the
// auto-resolve worker is consulting the LLM. Created in every environment
// (not just test) — production needs it for the inbound webhook to work.
// No password = no Account row = nobody can log in as it.
await upsertUser({
	email: AI_AGENT_EMAIL,
	name: AI_AGENT_NAME,
	role: Role.AGENT,
});

// Seed an additional AGENT user only in the test environment so e2e tests
// have a deterministic non-admin account for role-gating coverage. Kept
// hard-coded (not env-driven) so the test fixtures can rely on these
// credentials without extra .env wiring.
if (process.env.NODE_ENV === "test") {
	await upsertUser({
		email: "agent@test.local",
		password: "test-agent-password",
		name: "Test Agent",
		role: Role.AGENT,
	});
}

process.exit(0);
