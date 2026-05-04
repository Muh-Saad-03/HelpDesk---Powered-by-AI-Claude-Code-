/** @format */

import { Router, type Request, type Response } from "express";
import { Role } from "core";
import { prisma } from "../db.ts";
import { requireRole } from "../middleware/requireRole.ts";

export const ticketsRouter = Router();

ticketsRouter.get(
	"/",
	requireRole(Role.ADMIN, Role.AGENT),
	async (_req: Request, res: Response) => {
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
			orderBy: { createdAt: "desc" },
		});
		res.json({ tickets });
	},
);
