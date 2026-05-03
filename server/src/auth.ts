import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.ts";
import { Role } from "./generated/prisma/client.ts";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret === "REPLACE_ME_run_openssl_rand_-base64_32") {
	throw new Error(
		"BETTER_AUTH_SECRET is not configured. Generate one with: openssl rand -base64 32",
	);
}

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
	.split(",")
	.map((o) => o.trim())
	.filter(Boolean);

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
		requireEmailVerification: false,
	},
	user: {
		additionalFields: {
			role: {
				type: Object.values(Role),
				defaultValue: Role.AGENT,
				input: false,
			},
		},
	},
	rateLimit: {
		enabled: process.env.NODE_ENV === "production",
		window: 60,
		max: 100,
	},
	trustedOrigins,
});
