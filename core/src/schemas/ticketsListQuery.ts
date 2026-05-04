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

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

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
	// Pagination. Both arrive as strings on the wire; coerce to int and bound.
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type TicketsListQuery = z.infer<typeof ticketsListQuerySchema>;
