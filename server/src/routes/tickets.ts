/** @format */

import { Router, type Request, type Response } from "express";
import { Role, assignTicketSchema, ticketsListQuerySchema } from "core";
import { prisma } from "../db.ts";
import { requireRole } from "../middleware/requireRole.ts";

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
		const parsed = assignTicketSchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
			return;
		}
		const { assigneeId } = parsed.data;

		const ticket = await prisma.ticket.findUnique({
			where: { id: req.params.id },
			select: { id: true },
		});
		if (!ticket) {
			res.status(404).json({ error: "Ticket not found" });
			return;
		}

		if (assigneeId !== null) {
			const assignee = await prisma.user.findFirst({
				where: { id: assigneeId, deletedAt: null },
				select: { id: true },
			});
			if (!assignee) {
				res.status(400).json({ error: "Assignee not found" });
				return;
			}
		}

		const updated = await prisma.ticket.update({
			where: { id: req.params.id },
			data: { assigneeId },
			select: TICKET_DETAIL_SELECT,
		});
		res.json({ ticket: updated });
	},
);
