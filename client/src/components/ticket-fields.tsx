import { TicketCategory, TicketStatus } from "core";

const STATUS_CLASSES: Record<TicketStatus, string> = {
	[TicketStatus.NEW]: "bg-amber-500/10 text-amber-700",
	[TicketStatus.PROCESSING]: "bg-amber-500/10 text-amber-700",
	[TicketStatus.OPEN]: "bg-primary/10 text-primary",
	[TicketStatus.RESOLVED]: "bg-emerald-500/10 text-emerald-700",
	[TicketStatus.CLOSED]: "bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: TicketStatus }) {
	return (
		<span
			className={
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
				STATUS_CLASSES[status]
			}>
			{status.toLowerCase()}
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
