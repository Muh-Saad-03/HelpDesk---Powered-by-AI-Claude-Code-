import { auth } from "./auth.ts";
import { prisma } from "./db.ts";
import { Role } from "./generated/prisma/client.ts";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "Admin";

if (!email || !password) {
	console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
	process.exit(1);
}

async function upsertUser(opts: {
	email: string;
	password: string;
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

	const ctx = await auth.$context;
	const hashedPassword = await ctx.password.hash(opts.password);
	const userId = crypto.randomUUID();
	const accountId = crypto.randomUUID();

	await prisma.user.create({
		data: {
			id: userId,
			email: opts.email,
			name: opts.name,
			emailVerified: false,
			role: opts.role,
			accounts: {
				create: {
					id: accountId,
					accountId: userId,
					providerId: "credential",
					password: hashedPassword,
				},
			},
		},
	});

	console.log(`Created ${opts.role} user: ${opts.email}`);
}

await upsertUser({ email, password, name, role: Role.ADMIN });

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
