import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.ts";
import { Role } from "./generated/prisma/client.ts";

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
	trustedOrigins,
});
