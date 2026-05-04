/** @format */

import { Router, type Request, type Response } from "express";
import {
	createReplySchema,
	polishReplySchema,
	Role,
	SenderType,
	ticketsListQuerySchema,
	updateTicketSchema,
} from "core";
import { polishReplyText } from "../ai.ts";
import { prisma } from "../db.ts";
import { requireRole } from "../middleware/requireRole.ts";

const REPLY_SELECT = {
	id: true,
	body: true,
	createdAt: true,
	senderType: true,
	authorId: true,
	author: { select: { id: true, name: true, email: true } },
} as const;

const TICKET_DETAIL_SELECT = {
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

function firstIssueMessage(issues: readonly { message: string }[]): string {
	return issues[0]?.message ?? "Invalid input";
}

export const ticketsRouter = Router();

ticketsRouter.get(
	"/",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request, res: Response) => {
		const parsed = ticketsListQuerySchema.safeParse(req.query);
		if (!parsed.success) {
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
			return;
		}
		const { sortBy, sortOrder, status, category, q, page, pageSize } =
			parsed.data;

		type Where = {
			status?: { in: typeof status };
			category?: { in: typeof category };
			OR?: { [k: string]: { contains: string; mode: "insensitive" } }[];
		};
		const where: Where = {};
		if (status && status.length > 0) where.status = { in: status };
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
		res.json({ tickets, total, page, pageSize });
	},
);

ticketsRouter.get(
	"/:id",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request<{ id: string }>, res: Response) => {
		const ticket = await prisma.ticket.findUnique({
			where: { id: req.params.id },
			select: TICKET_DETAIL_SELECT,
		});
		if (!ticket) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}
		res.json({ ticket });
	},
);

ticketsRouter.patch(
	"/:id",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request<{ id: string }>, res: Response) => {
		const parsed = updateTicketSchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
			return;
		}
		const { assigneeId, status, category } = parsed.data;

		const ticket = await prisma.ticket.findUnique({
			where: { id: req.params.id },
			select: { id: true },
		});
		if (!ticket) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}

		// Only verify the assignee user when the caller is actually setting one.
		// `undefined` = field omitted (not changing), `null` = explicit unassign.
		if (assigneeId !== undefined && assigneeId !== null) {
			const assignee = await prisma.user.findFirst({
				where: { id: assigneeId, deletedAt: null },
				select: { id: true },
			});
			if (!assignee) {
				res.status(400).json({ error: "Assignee not found" });
				return;
			}
		}

		// Build the update payload from defined fields only — Prisma treats
		// undefined as "leave alone" and null as "set to null", which lines up
		// with our schema semantics for `assigneeId` / `category`.
		const data: {
			assigneeId?: string | null;
			status?: typeof status;
			category?: typeof category;
		} = {};
		if (assigneeId !== undefined) data.assigneeId = assigneeId;
		if (status !== undefined) data.status = status;
		if (category !== undefined) data.category = category;

		const updated = await prisma.ticket.update({
			where: { id: req.params.id },
			data,
			select: TICKET_DETAIL_SELECT,
		});
		res.json({ ticket: updated });
	},
);

ticketsRouter.get(
	"/:id/replies",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request<{ id: string }>, res: Response) => {
		const ticket = await prisma.ticket.findUnique({
			where: { id: req.params.id },
			select: { id: true },
		});
		if (!ticket) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}
		const replies = await prisma.reply.findMany({
			where: { ticketId: req.params.id },
			orderBy: { createdAt: "asc" },
			select: REPLY_SELECT,
		});
		res.json({ replies });
	},
);

ticketsRouter.post(
	"/:id/replies",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request<{ id: string }>, res: Response) => {
		const parsed = createReplySchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
			return;
		}

		const ticket = await prisma.ticket.findUnique({
			where: { id: req.params.id },
			select: { id: true },
		});
		if (!ticket) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}

		const authorId = req.session!.user.id;
		const reply = await prisma.reply.create({
			data: {
				ticketId: req.params.id,
				senderType: SenderType.AGENT,
				authorId,
				body: parsed.data.body,
			},
			select: REPLY_SELECT,
		});
		res.status(201).json({ reply });
	},
);

ticketsRouter.post(
	"/:id/polish-reply",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request<{ id: string }>, res: Response) => {
		const parsed = polishReplySchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
			return;
		}

		const ticket = await prisma.ticket.findUnique({
			where: { id: req.params.id },
			select: {
				subject: true,
				body: true,
				fromName: true,
				fromEmail: true,
				replies: {
					orderBy: { createdAt: "asc" },
					select: {
						body: true,
						senderType: true,
						author: { select: { name: true } },
					},
				},
			},
		});
		if (!ticket) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}

		const polished = await polishReplyText({
			subject: ticket.subject,
			customerName: ticket.fromName,
			customerEmail: ticket.fromEmail,
			originalMessage: ticket.body,
			history: ticket.replies.map((r) => ({
				senderType: r.senderType as SenderType,
				authorName: r.author?.name ?? null,
				body: r.body,
			})),
			draft: parsed.data.body,
			agentName: req.session!.user.name,
		});
		res.json({ body: polished });
	},
);
