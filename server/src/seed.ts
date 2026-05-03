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

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
	if (existing.role !== Role.ADMIN) {
		await prisma.user.update({
			where: { id: existing.id },
			data: { role: Role.ADMIN },
		});
		console.log(`Promoted existing user ${email} to ${Role.ADMIN}`);
	} else {
		console.log(`Admin already exists: ${email}`);
	}
	process.exit(0);
}

const ctx = await auth.$context;
const hashedPassword = await ctx.password.hash(password);
const userId = crypto.randomUUID();
const accountId = crypto.randomUUID();

await prisma.user.create({
	data: {
		id: userId,
		email,
		name,
		emailVerified: false,
		role: Role.ADMIN,
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

console.log(`Created admin user: ${email}`);
process.exit(0);
