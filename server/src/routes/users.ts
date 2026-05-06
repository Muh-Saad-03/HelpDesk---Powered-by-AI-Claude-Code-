/** @format */

import { Router, type Request, type Response } from "express";
import { Role, createUserSchema, updateUserSchema } from "core";
import { prisma } from "../db.ts";
import { auth } from "../auth.ts";
import { requireRole } from "../middleware/requireRole.ts";
import { AI_AGENT_EMAIL } from "../aiAgent.ts";

function firstIssueMessage(issues: readonly { message: string }[]): string {
	return issues[0]?.message ?? "Invalid input";
}

export const usersRouter = Router();

usersRouter.get(
	"/",
	requireRole(Role.ADMIN),
	async (_req: Request, res: Response) => {
		const users = await prisma.user.findMany({
			where: { deletedAt: null, email: { not: AI_AGENT_EMAIL } },
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

// Minimal user list for ticket-assignment dropdowns. Open to AGENT as well as
// ADMIN — agents need to see other agents to reassign their tickets — but the
// payload is intentionally narrow (no role / createdAt) so it doesn't double
// as a roster endpoint.
usersRouter.get(
	"/assignable",
	requireRole(Role.ADMIN, Role.AGENT),
	async (_req: Request, res: Response) => {
		const users = await prisma.user.findMany({
			where: { deletedAt: null, email: { not: AI_AGENT_EMAIL } },
			select: { id: true, name: true, email: true },
			orderBy: { name: "asc" },
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
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
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

usersRouter.patch(
	"/:id",
	requireRole(Role.ADMIN),
	async (req: Request, res: Response) => {
		const parsed = updateUserSchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: firstIssueMessage(parsed.error.issues) });
			return;
		}
		const { name, email, password } = parsed.data;
		const id = req.params.id;
		if (typeof id !== "string") {
			res.status(400).json({ error: "Invalid user id" });
			return;
		}

		const existing = await prisma.user.findFirst({
			where: { id, deletedAt: null },
		});
		if (!existing) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		if (email !== existing.email) {
			const collision = await prisma.user.findUnique({ where: { email } });
			if (collision) {
				res.status(409).json({ error: "Email already in use" });
				return;
			}
		}

		const user = await prisma.user.update({
			where: { id },
			data: { name, email },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				createdAt: true,
			},
		});

		if (password && password.length > 0) {
			const ctx = await auth.$context;
			const hashed = await ctx.password.hash(password);
			await prisma.account.updateMany({
				where: { userId: id, providerId: "credential" },
				data: { password: hashed },
			});
		}

		res.json({ user });
	},
);

usersRouter.delete(
	"/:id",
	requireRole(Role.ADMIN),
	async (req: Request, res: Response) => {
		const id = req.params.id;
		if (typeof id !== "string") {
			res.status(400).json({ error: "Invalid user id" });
			return;
		}

		const user = await prisma.user.findFirst({
			where: { id, deletedAt: null },
		});
		if (!user) {
			res.status(404).json({ error: "User not found" });
			return;
		}
		if (user.role === Role.ADMIN) {
			res.status(403).json({ error: "Admin users cannot be deleted" });
			return;
		}

		const sentinelEmail = `deleted-${id}@deleted.invalid`;
		await prisma.$transaction([
			prisma.user.update({
				where: { id },
				data: {
					deletedAt: new Date(),
					deletedEmail: user.email,
					email: sentinelEmail,
				},
			}),
			prisma.ticket.updateMany({
				where: { assigneeId: id },
				data: { assigneeId: null },
			}),
			prisma.session.deleteMany({ where: { userId: id } }),
			prisma.account.updateMany({
				where: { userId: id, providerId: "credential" },
				data: { password: null },
			}),
		]);

		res.status(204).send();
	},
);
