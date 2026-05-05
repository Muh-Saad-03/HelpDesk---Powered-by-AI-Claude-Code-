import { TicketCategory, TicketStatus } from "core";

const STATUS_DOT: Record<TicketStatus, string> = {
	[TicketStatus.NEW]: "text-status-new",
	[TicketStatus.PROCESSING]: "text-status-new",
	[TicketStatus.OPEN]: "text-status-open",
	[TicketStatus.RESOLVED]: "text-status-resolved",
	[TicketStatus.CLOSED]: "text-status-closed",
};

// PROCESSING gets a live pulse — it's actively being worked by the AI
const STATUS_PULSE: Partial<Record<TicketStatus, boolean>> = {
	[TicketStatus.PROCESSING]: true,
};

export function StatusPill({ status }: { status: TicketStatus }) {
	return (
		<span className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[10px] tracking-widest uppercase text-foreground">
			<span
				aria-hidden
				className={
					"status-dot bg-current " +
					STATUS_DOT[status] +
					(STATUS_PULSE[status] ? " animate-pulse-dot" : "")
				}
			/>
			<span>{status.toLowerCase()}</span>
		</span>
	);
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
	[TicketStatus.NEW]: "New",
	[TicketStatus.PROCESSING]: "Processing",
	[TicketStatus.OPEN]: "Open",
	[TicketStatus.RESOLVED]: "Resolved",
	[TicketStatus.CLOSED]: "Closed",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
	[TicketCategory.GENERAL_QUESTION]: "General",
	[TicketCategory.TECHNICAL_QUESTION]: "Technical",
	[TicketCategory.REFUND_REQUEST]: "Refund",
};

// NEW + PROCESSING are AI-managed states; agents shouldn't set them by hand,
// so they're omitted from the status selector even though they have labels.
const AGENT_SETTABLE_STATUSES: TicketStatus[] = [
	TicketStatus.OPEN,
	TicketStatus.RESOLVED,
	TicketStatus.CLOSED,
];

export const STATUS_OPTIONS = AGENT_SETTABLE_STATUSES.map((value) => ({
	value,
	label: STATUS_LABELS[value],
}));

export const CATEGORY_OPTIONS = (
	Object.entries(CATEGORY_LABELS) as [TicketCategory, string][]
).map(([value, label]) => ({ value, label }));
