import { TicketCategory, TicketStatus } from "core";

const STATUS_CLASSES: Record<TicketStatus, string> = {
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

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
	[TicketCategory.GENERAL_QUESTION]: "General",
	[TicketCategory.TECHNICAL_QUESTION]: "Technical",
	[TicketCategory.REFUND_REQUEST]: "Refund",
};
