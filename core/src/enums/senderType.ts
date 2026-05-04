// Mirrors the Prisma `SenderType` enum in server/prisma/schema.prisma.
// Distinguishes replies authored by an internal agent (logged-in User) from
// replies authored by the original ticket sender (no internal User — they
// arrive via inbound email threading).
export enum SenderType {
	AGENT = "AGENT",
	CUSTOMER = "CUSTOMER",
}
