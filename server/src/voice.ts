/** @format */

import { z } from "zod";
import { VOICE_TOOL_SCHEMAS, type VoiceToolName } from "core";
import { buildVoiceInstructions, TOOL_DESCRIPTIONS } from "./assistant.ts";
import { loadKnowledgeBase } from "./knowledge-base.ts";

const REALTIME_MODEL = "gpt-realtime-2";
const OUTPUT_VOICE = "marin";
const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

function buildTools() {
	return (Object.keys(VOICE_TOOL_SCHEMAS) as VoiceToolName[]).map((name) => ({
		type: "function" as const,
		name,
		description: TOOL_DESCRIPTIONS[name],
		parameters: z.toJSONSchema(VOICE_TOOL_SCHEMAS[name]),
	}));
}

export type VoiceSession = {
	value: string;
	expiresAt: number;
};

export async function mintVoiceSession(user: {
	name: string;
	role: string;
}): Promise<VoiceSession> {
	const knowledgeBase = await loadKnowledgeBase();
	const res = await fetch(CLIENT_SECRETS_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			session: {
				type: "realtime",
				model: REALTIME_MODEL,
				instructions: buildVoiceInstructions(user, knowledgeBase),
				audio: {
					input: { transcription: { model: "gpt-4o-mini-transcribe" } },
					output: { voice: OUTPUT_VOICE },
				},
				tools: buildTools(),
			},
		}),
	});
	if (!res.ok) {
		throw new Error(
			`OpenAI client_secrets request failed: ${res.status} ${await res.text()}`,
		);
	}
	const data = (await res.json()) as { value: string; expires_at: number };
	return { value: data.value, expiresAt: data.expires_at };
}
