/** @format */

import { SenderType, TicketStatus, type TicketsListQuery } from "core";
import { prisma } from "./db.ts";
import { enqueueSendReply } from "./queue.ts";

// Ticket queries shared by the REST routes (routes/tickets.ts) and the AI
// assistant tools (chatTools.ts / the voice assistant via the REST routes) —
// one implementation so rules like the hidden NEW/PROCESSING statuses and
// the reply → email pipeline can't drift between surfaces.

export const REPLY_SELECT = {
	id: true,
	body: true,
	createdAt: true,
	senderType: true,
	authorId: true,
	author: { select: { id: true, name: true, email: true } },
} as const;

export const TICKET_DETAIL_SELECT = {
	id: true,
	subject: true,
	body: true,
	status: true,
	category: true,
	fromEmail: true,
	fromName: true,
	assigneeId: true,
	assignee: { select: { id: true, name: true, email: true } },
	createdAt: true,
	updatedAt: true,
} as const;

export async function listTickets(args: TicketsListQuery) {
	const { sortBy, sortOrder, status, category, q, page, pageSize } = args;

	// Tickets in NEW / PROCESSING are still being handled by the AI
	// auto-resolve worker. Hide them from the agent list regardless of
	// the caller's status filter — agents shouldn't see half-handled
	// tickets, and once the worker finishes they'll surface as RESOLVED
	// or OPEN.
	const AI_HIDDEN_STATUSES: TicketStatus[] = [
		TicketStatus.NEW,
		TicketStatus.PROCESSING,
	];
	const visibleStatuses =
		status && status.length > 0 ?
			status.filter((s) => !AI_HIDDEN_STATUSES.includes(s))
		:	[TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED];

	type Where = {
		status: { in: TicketStatus[] };
		category?: { in: typeof category };
		OR?: { [k: string]: { contains: string; mode: "insensitive" } }[];
	};
	const where: Where = { status: { in: visibleStatuses } };
	if (category && category.length > 0) where.category = { in: category };
	if (q) {
		where.OR = [
			{ subject: { contains: q, mode: "insensitive" } },
			{ fromEmail: { contains: q, mode: "insensitive" } },
			{ fromName: { contains: q, mode: "insensitive" } },
		];
	}

	const [tickets, total] = await prisma.$transaction([
		prisma.ticket.findMany({
			where,
			select: {
				id: true,
				subject: true,
				status: true,
				category: true,
				fromEmail: true,
				fromName: true,
				createdAt: true,
			},
			orderBy: { [sortBy]: sortOrder },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		prisma.ticket.count({ where }),
	]);
	return { tickets, total, page, pageSize };
}

export async function getTicketDetail(id: string) {
	return prisma.ticket.findUnique({
		where: { id },
		select: TICKET_DETAIL_SELECT,
	});
}

// Returns null when the ticket itself doesn't exist (vs [] for "no replies").
export async function getTicketReplies(id: string) {
	const ticket = await prisma.ticket.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!ticket) return null;
	return prisma.reply.findMany({
		where: { ticketId: id },
		orderBy: { createdAt: "asc" },
		select: REPLY_SELECT,
	});
}

// Core aggregation lives in the get_ticket_stats() Postgres function (see
// migration 20260505001253_add_ticket_stats_function); resolved/closed
// breakdowns are supplemented here (the assistants' status widget shows all
// three buckets, and the PG function only breaks out `open`).
export type TicketStats = {
	total: number;
	open: number;
	resolved: number;
	closed: number;
	aiResolved: number;
	aiResolvedPct: number | null;
	avgResolutionMs: number | null;
	daily: { date: string; count: number }[];
};

export async function getTicketStats(): Promise<TicketStats> {
	const [rows, byStatus] = await Promise.all([
		prisma.$queryRaw<
			[{ stats: Omit<TicketStats, "resolved" | "closed"> }]
		>`SELECT get_ticket_stats() AS stats`,
		prisma.ticket.groupBy({
			by: ["status"],
			where: { status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
			_count: { _all: true },
		}),
	]);
	const count = (status: TicketStatus) =>
		byStatus.find((row) => row.status === status)?._count._all ?? 0;
	return {
		...rows[0].stats,
		resolved: count(TicketStatus.RESOLVED),
		closed: count(TicketStatus.CLOSED),
	};
}

// Creates an AGENT reply and enqueues the customer email. Returns null when
// the ticket doesn't exist. The email goes out-of-band via pg-boss — retries
// on SendGrid hiccups without blocking the caller.
export async function createTicketReply(
	ticketId: string,
	authorId: string,
	body: string,
) {
	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId },
		select: { id: true },
	});
	if (!ticket) return null;

	const reply = await prisma.reply.create({
		data: {
			ticketId,
			senderType: SenderType.AGENT,
			authorId,
			body,
		},
		select: REPLY_SELECT,
	});
	await enqueueSendReply(reply.id);
	return reply;
}
