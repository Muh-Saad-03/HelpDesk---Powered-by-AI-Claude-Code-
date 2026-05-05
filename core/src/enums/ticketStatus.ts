// Mirrors the Prisma `TicketStatus` enum in server/prisma/schema.prisma.
export enum TicketStatus {
	// Just landed from the inbound webhook — pending AI auto-resolve pickup.
	NEW = "NEW",
	// AI worker is currently consulting the knowledge base.
	PROCESSING = "PROCESSING",
	// AI couldn't resolve from the KB; needs a human agent.
	OPEN = "OPEN",
	RESOLVED = "RESOLVED",
	CLOSED = "CLOSED",
}
