/** @format */

import { Router, type Request, type Response } from "express";
import { createUserSchema } from "core";
import { prisma } from "../db.ts";
import { auth } from "../auth.ts";
import { requireRole } from "../middleware/requireRole.ts";
import { Role } from "../generated/prisma/client.ts";

export const usersRouter = Router();

usersRouter.get(
	"/",
	requireRole(Role.ADMIN),
	async (_req: Request, res: Response) => {
		const users = await prisma.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				createdAt: true,
			},
			orderBy: { createdAt: "asc" },
		});
		res.json({ users });
	},
);

usersRouter.post(
	"/",
	requireRole(Role.ADMIN),
	async (req: Request, res: Response) => {
		const parsed = createUserSchema.safeParse(req.body);
		if (!parsed.success) {
			res
				.status(400)
				.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
			return;
		}
		const { name, email, password } = parsed.data;

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			res.status(409).json({ error: "Email already in use" });
			return;
		}

		const ctx = await auth.$context;
		const hashedPassword = await ctx.password.hash(password);
		const userId = crypto.randomUUID();
		const accountId = crypto.randomUUID();

		const user = await prisma.user.create({
			data: {
				id: userId,
				name,
				email,
				emailVerified: false,
				role: Role.AGENT,
				accounts: {
					create: {
						id: accountId,
						accountId: userId,
						providerId: "credential",
						password: hashedPassword,
					},
				},
			},
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				createdAt: true,
			},
		});

		res.status(201).json({ user });
	},
);
