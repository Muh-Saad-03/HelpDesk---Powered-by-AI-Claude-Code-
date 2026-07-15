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
import { polishReplyText, summarizeTicketText } from "../ai.ts";
import { prisma } from "../db.ts";
import { requireRole } from "../middleware/requireRole.ts";
import {
	createTicketReply,
	getTicketDetail,
	getTicketReplies,
	getTicketStats,
	listTickets,
	TICKET_DETAIL_SELECT,
} from "../ticketQueries.ts";

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
		res.json(await listTickets(parsed.data));
	},
);

// Must be declared before "/:id" — Express matches routes in declaration
// order, so otherwise "stats" gets caught as an :id lookup and 404s.
ticketsRouter.get(
	"/stats",
	requireRole(Role.ADMIN, Role.AGENT),
	async (_req: Request, res: Response) => {
		res.json(await getTicketStats());
	},
);

ticketsRouter.get(
	"/:id",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request<{ id: string }>, res: Response) => {
		const ticket = await getTicketDetail(req.params.id);
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
		const replies = await getTicketReplies(req.params.id);
		if (!replies) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}
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

		const reply = await createTicketReply(
			req.params.id,
			req.session!.user.id,
			parsed.data.body,
		);
		if (!reply) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}
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

ticketsRouter.post(
	"/:id/summarize",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request<{ id: string }>, res: Response) => {
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

		const summary = await summarizeTicketText({
			subject: ticket.subject,
			customerName: ticket.fromName,
			customerEmail: ticket.fromEmail,
			originalMessage: ticket.body,
			history: ticket.replies.map((r) => ({
				senderType: r.senderType as SenderType,
				authorName: r.author?.name ?? null,
				body: r.body,
			})),
		});
		res.json({ summary });
	},
);
