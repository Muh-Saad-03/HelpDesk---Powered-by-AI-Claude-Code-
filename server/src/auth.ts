import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.ts";
import { Role } from "./generated/prisma/client.ts";

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
	trustedOrigins: ["http://localhost:5173"],
});
