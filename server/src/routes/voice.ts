/** @format */

import { Router, type Request, type Response } from "express";
import { Role } from "core";
import { requireRole } from "../middleware/requireRole.ts";
import { mintVoiceSession } from "../voice.ts";

export const voiceRouter = Router();

// Mints an ephemeral OpenAI Realtime client secret so the browser can open
// a WebRTC session directly with OpenAI. The real API key never leaves the
// server; the secret is short-lived and scoped to one session.
voiceRouter.post(
	"/session",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request, res: Response) => {
		const { name, role } = req.session!.user;
		const session = await mintVoiceSession({ name, role: role as string });
		res.json(session);
	},
);
