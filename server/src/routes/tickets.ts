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
		const { sortBy, sortOrder } = parsed.data;

		const tickets = await prisma.ticket.findMany({
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
