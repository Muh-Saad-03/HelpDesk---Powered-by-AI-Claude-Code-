/** @format */

import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
	res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
