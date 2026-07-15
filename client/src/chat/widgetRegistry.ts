import {
	SenderType,
	TicketCategory,
	type VoiceToolName,
} from "core";
import { CATEGORY_LABELS } from "@/components/ticket-fields";
import type { WidgetNode } from "./widgetTypes";
import searchTickets from "./widgets/search_tickets.json";
import getTicket from "./widgets/get_ticket.json";
import getTicketReplies from "./widgets/get_ticket_replies.json";
import getTicketStats from "./widgets/get_ticket_stats.json";
import replyToTicket from "./widgets/reply_to_ticket.json";

// Tool name → widget template. Templates under ./widgets/ are ChatKit Studio
// Widget Builder exports (widgets.chatkit.studio); to wire a new export:
//   1. drop the JSON file in ./widgets/
//   2. replace its sample text with {{path}} placeholders over the tool
//      output, and put `"repeat": "path.to.array"` on the node that should
//      clone per element (bindings inside it use {{item.*}} / {{index}})
//   3. add one entry here (a `transform` can precompute display labels so
//      the template stays dumb)
// get_ticket.json (customer profile card) and get_ticket_stats.json (status
// tiles) are ChatKit Studio exports with bindings applied; search_tickets.json
// and get_ticket_replies.json are still hand-written placeholders — swap them
// for real exports as they're ready.

export type WidgetEntry = {
	template: WidgetNode;
	/** Optional pre-bind step for display formatting (dates, percentages…). */
	transform?: (output: unknown) => unknown;
};

function formatDate(iso: unknown): string {
	if (typeof iso !== "string") return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

type TicketRow = {
	fromName?: string | null;
	fromEmail?: string;
	category?: string | null;
	createdAt?: string;
};

function ticketLabels(t: TicketRow) {
	return {
		fromLabel: t.fromName || t.fromEmail || "Unknown",
		categoryLabel:
			t.category ? (CATEGORY_LABELS[t.category as TicketCategory] ?? t.category) : "Uncategorized",
		createdAtLabel: formatDate(t.createdAt),
	};
}

const registry: Partial<Record<VoiceToolName, WidgetEntry>> = {
	search_tickets: {
		template: searchTickets as WidgetNode,
		transform: (output) => {
			const o = output as { tickets: TicketRow[]; total: number };
			return {
				...o,
				totalLabel: `${o.total} match${o.total === 1 ? "" : "es"}`,
				tickets: o.tickets.map((t) => ({ ...t, ...ticketLabels(t) })),
			};
		},
	},
	get_ticket: {
		template: getTicket as WidgetNode,
		transform: (output) => {
			const t = output as TicketRow & { assignee?: { name?: string } | null };
			return {
				...t,
				...ticketLabels(t),
				assigneeLabel: t.assignee?.name ?? "Unassigned",
			};
		},
	},
	get_ticket_replies: {
		template: getTicketReplies as WidgetNode,
		transform: (output) => {
			const o = output as {
				replies: {
					senderType?: string;
					author?: { name?: string } | null;
					createdAt?: string;
				}[];
			};
			return {
				replies: o.replies.map((r) => ({
					...r,
					senderLabel:
						r.senderType === SenderType.CUSTOMER ?
							"Customer"
						:	(r.author?.name ?? "Agent"),
					createdAtLabel: formatDate(r.createdAt),
				})),
			};
		},
	},
	// The stats template binds open/resolved/closed straight off the tool
	// output — no display formatting needed.
	get_ticket_stats: { template: getTicketStats as WidgetNode },
	reply_to_ticket: {
		template: replyToTicket as WidgetNode,
		transform: (output) => {
			const o = output as { reply: { createdAt?: string } };
			return { ...o, createdAtLabel: formatDate(o.reply.createdAt) };
		},
	},
};

// Widened key type: callers look up by the tool name parsed off a stream
// part ("tool-…"), which is a plain string.
export const WIDGET_REGISTRY: Record<string, WidgetEntry | undefined> = registry;
