/** @format */

import { Router, type Request, type Response } from "express";
import { Role, ticketsListQuerySchema } from "core";
import { prisma } from "../db.ts";
import { requireRole } from "../middleware/requireRole.ts";

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
		const { sortBy, sortOrder, status, category, q } = parsed.data;

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

		const tickets = await prisma.ticket.findMany({
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
		});
		res.json({ tickets });
	},
);
