// Mirrors the Prisma `Role` enum in server/prisma/schema.prisma. Defined here
// (not on the server) so the client can import it without depending on the
// Prisma generated client.
export enum Role {
	ADMIN = "ADMIN",
	AGENT = "AGENT",
}
