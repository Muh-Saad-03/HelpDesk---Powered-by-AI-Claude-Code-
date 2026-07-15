/** @format */

import axios, { AxiosError } from "axios";
import {
	VOICE_TOOL_SCHEMAS,
	type GetTicketArgs,
	type ReplyToTicketArgs,
	type SearchTicketsArgs,
	type VoiceToolName,
} from "core";

// Keep spoken result sets small — the assistant summarizes, it doesn't page
// through long lists.
const PAGE_SIZE = 10;

// Executes a Realtime function call by hitting the existing ticket endpoints
// with the user's own session cookie. Result shapes intentionally match the
// server-side chat tools (server/src/chatTools.ts) so both assistants bind
// to the same widget templates. Always resolves to a JSON string (result or
// { error }) — the output goes back to the model over the data channel, so
// errors must be returned, not thrown, for the assistant to recover verbally.
export async function executeVoiceTool(
	name: string,
	argsJson: string,
): Promise<string> {
	const schema = VOICE_TOOL_SCHEMAS[name as VoiceToolName];
	if (!schema) return JSON.stringify({ error: `Unknown tool: ${name}` });

	let raw: unknown;
	try {
		raw = JSON.parse(argsJson || "{}");
	} catch {
		return JSON.stringify({ error: "Arguments were not valid JSON" });
	}

	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		return JSON.stringify({
			error: parsed.error.issues[0]?.message ?? "Invalid arguments",
		});
	}

	try {
		const data = await dispatch(name as VoiceToolName, parsed.data);
		return JSON.stringify(data);
	} catch (err) {
		const axiosErr = err as AxiosError<{ error?: string }>;
		return JSON.stringify({
			error: axiosErr.response?.data?.error ?? axiosErr.message,
		});
	}
}

async function dispatch(name: VoiceToolName, args: unknown): Promise<unknown> {
	const cfg = { withCredentials: true } as const;
	switch (name) {
		case "search_tickets": {
			const { query, status, category, page } = args as SearchTicketsArgs;
			const res = await axios.get("/api/tickets", {
				...cfg,
				params: {
					pageSize: PAGE_SIZE,
					...(page !== undefined && { page }),
					...(query !== undefined && { q: query }),
					...(status !== undefined && { status }),
					...(category !== undefined && { category }),
				},
			});
			return res.data;
		}
		case "get_ticket": {
			const { ticket_id } = args as GetTicketArgs;
			const res = await axios.get(`/api/tickets/${ticket_id}`, cfg);
			// Unwrap { ticket } to the bare object — the chat tool's shape.
			return res.data.ticket;
		}
		case "get_ticket_replies": {
			const { ticket_id } = args as GetTicketArgs;
			const res = await axios.get(`/api/tickets/${ticket_id}/replies`, cfg);
			return res.data;
		}
		case "get_ticket_stats": {
			const res = await axios.get("/api/tickets/stats", cfg);
			return res.data;
		}
		case "reply_to_ticket": {
			const { ticket_id, body } = args as ReplyToTicketArgs;
			const res = await axios.post(
				`/api/tickets/${ticket_id}/replies`,
				{ body },
				cfg,
			);
			return res.data;
		}
	}
}
