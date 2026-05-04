// Mirrors the Prisma `Role` enum in server/prisma/schema.prisma. Defined here
// (not on the server) so the client can import it without depending on the
// Prisma generated client. Structurally compatible with Prisma's generated
// `Role` type, so trusted server code can use this same constant for query
// args (`data: { role: Role.AGENT }`).
export const Role = {
	ADMIN: "ADMIN",
	AGENT: "AGENT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
