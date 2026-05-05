/** @format */

// Sentry init must run before any other import so its auto-instrumentation
// (http, express, etc.) can wrap the modules as they're loaded.
import "./instrument.ts";

import path from "node:path";
import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import cors from "cors";
import * as Sentry from "@sentry/bun";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "./db.ts";
import { auth } from "./auth.ts";
import { startQueue, stopQueue } from "./queue.ts";
import { usersRouter } from "./routes/users.ts";
import { emailRouter } from "./routes/email.ts";
import { ticketsRouter } from "./routes/tickets.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";

// Behind Railway's load balancer (or any reverse proxy), Express needs to
// trust the X-Forwarded-* headers so `req.secure` and `req.ip` resolve
// correctly — Better Auth's secure cookies and any rate-limiting depend
// on this.
if (isProduction) app.set("trust proxy", 1);

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
app.use("/api/email", emailRouter);
app.use("/api/tickets", ticketsRouter);

// In production we serve the built React SPA from the same origin as the
// API. This keeps the deployment to a single Railway service and avoids
// any cross-site-cookie footgun for Better Auth's session cookies. In
// dev, Vite handles its own dev server on :5173, so we skip this entirely.
if (isProduction) {
	const clientDist = path.resolve(import.meta.dirname, "../../client/dist");
	// `index: true` (default) lets the static middleware serve index.html
	// for "/" — Express 5's `/*splat` wildcard matches one-or-more segments
	// and so wouldn't catch "/" on its own.
	app.use(express.static(clientDist, { maxAge: "1h" }));

	// SPA fallback — anything that isn't an /api/* route gets index.html so
	// react-router can resolve it client-side. Unknown /api/* paths fall
	// through to the 404 / error handler instead of being served HTML.
	app.get("/*splat", (req: Request, res: Response, next: NextFunction) => {
		if (req.path.startsWith("/api/")) return next();
		res.sendFile(path.join(clientDist, "index.html"));
	});
}

// Sentry's Express error handler — captures anything that bubbles out of a
// route handler. Must come AFTER all routes and BEFORE our own error
// middleware. No-op when SENTRY_DSN is unset (init was skipped).

Sentry.setupExpressErrorHandler(app);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error(err);
	const isDev = process.env.NODE_ENV !== "production";
	res
		.status(500)
		.json({ error: isDev ? err.message : "Internal server error" });
});

await startQueue();

const server = app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});

async function shutdown(signal: string): Promise<void> {
	console.log(`Received ${signal}, shutting down...`);
	await stopQueue();
	server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
