import { z } from "zod";
import { TicketCategory } from "../enums/ticketCategory.ts";
import { TicketStatus } from "../enums/ticketStatus.ts";

// Literals must match Prisma `Ticket` column names exactly — they feed
// directly into Prisma `orderBy`. Keep in sync with server/prisma/schema.prisma.
export const TICKET_SORT_FIELDS = [
	"subject",
	"fromEmail",
	"status",
	"category",
	"createdAt",
] as const;
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// Express parses repeated query keys (?status=OPEN&status=RESOLVED) as arrays,
// but a single value (?status=OPEN) arrives as a bare string. Normalize both
// shapes into an array before validating against the enum.
const arrayOf = <T extends z.ZodEnum<Record<string, string>>>(schema: T) =>
	z
		.union([schema, z.array(schema)])
		.transform((v): z.infer<T>[] => (Array.isArray(v) ? v : [v]));

export const ticketsListQuerySchema = z.object({
	sortBy: z.enum(TICKET_SORT_FIELDS).default("createdAt"),
	sortOrder: z.enum(SORT_ORDERS).default("desc"),
	status: arrayOf(z.enum(TicketStatus)).optional(),
	category: arrayOf(z.enum(TicketCategory)).optional(),
	// Free-text search across subject + fromName + fromEmail. Trimmed; empty
	// strings drop off and behave as "no search".
	q: z
		.string()
		.trim()
		.min(1)
		.optional()
		.or(z.literal("").transform(() => undefined)),
});
export type TicketsListQuery = z.infer<typeof ticketsListQuerySchema>;
