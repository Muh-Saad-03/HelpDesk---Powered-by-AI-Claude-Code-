/** @format */

import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import cors from "cors";
import { prisma } from "./db.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
	res.json({ status: "ok", uptime: process.uptime() });
});

app.get(
	"/api/db/health",
	async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const rows = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
			const userCount = await prisma.user.count();
			res.json({ status: "ok", now: rows[0]?.now, userCount });
		} catch (err) {
			next(err);
		}
	},
);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error(err);
	res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
