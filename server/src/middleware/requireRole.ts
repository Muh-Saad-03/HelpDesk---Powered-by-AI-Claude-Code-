import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { type Role } from "core";
import { auth } from "../auth.ts";

declare global {
	namespace Express {
		interface Request {
			session?: Awaited<ReturnType<typeof auth.api.getSession>>;
		}
	}
}

export function requireRole(...roles: [Role, ...Role[]]) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (!session) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		if (!roles.includes(session.user.role as Role)) {
			res.status(403).json({ error: "Forbidden" });
			return;
		}

		req.session = session;
		next();
	};
}
