/** @format */

import { Router, type Request, type Response } from "express";
import {
	convertToModelMessages,
	safeValidateUIMessages,
	stepCountIs,
	streamText,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { Role } from "core";
import { buildChatInstructions } from "../assistant.ts";
import { buildChatTools } from "../chatTools.ts";
import { loadKnowledgeBase } from "../knowledge-base.ts";
import { requireRole } from "../middleware/requireRole.ts";

export const chatRouter = Router();

// Streaming chat endpoint for the in-app assistant. The client posts its full
// UIMessage history each turn; the response is an AI SDK UI-message stream
// (SSE) consumed by useChat.
chatRouter.post(
	"/",
	requireRole(Role.ADMIN, Role.AGENT),
	async (req: Request, res: Response) => {
		// The AI SDK's own validator for its UIMessage wire format — its
		// equivalent of our usual zod safeParse for this SDK-defined body.
		const validated = await safeValidateUIMessages({
			messages: req.body?.messages,
		});
		if (!validated.success) {
			res.status(400).json({ error: "Invalid messages" });
			return;
		}

		const { id, name, role } = req.session!.user;
		const knowledgeBase = await loadKnowledgeBase();

		const result = streamText({
			model: openai("gpt-5-nano"),
			system: buildChatInstructions({ name, role: role as string }, knowledgeBase),
			messages: await convertToModelMessages(validated.data),
			tools: buildChatTools({ id }),
			// Allow tool-call → answer round trips (default stops after 1 step).
			stopWhen: stepCountIs(5),
			providerOptions: { openai: { reasoningEffort: "low" } },
		});

		result.pipeUIMessageStreamToResponse(res);
	},
);
