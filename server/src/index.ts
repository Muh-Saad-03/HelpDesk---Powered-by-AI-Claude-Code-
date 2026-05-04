/** @format */

import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "./db.ts";
import { auth } from "./auth.ts";
import { usersRouter } from "./routes/users.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
	.split(",")
	.map((o) => o.trim())
	.filter(Boolean);

app.use(cors({ origin: trustedOrigins, credentials: true }));

// Better Auth handler — must be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
	res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/db/health", async (_req: Request, res: Response) => {
	const rows = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
	res.json({ status: "ok", now: rows[0]?.now });
});

app.use("/api/users", usersRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error(err);
	const isDev = process.env.NODE_ENV !== "production";
	res
		.status(500)
		.json({ error: isDev ? err.message : "Internal server error" });
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
