import type { TicketCategory } from "../enums/ticketCategory.ts";
import type { TicketStatus } from "../enums/ticketStatus.ts";

export type TicketAssignee = {
	id: string;
	name: string;
	email: string;
};

export type Ticket = {
	id: string;
	subject: string;
	body: string;
	status: TicketStatus;
	category: TicketCategory | null;
	fromEmail: string;
	fromName: string | null;
	assigneeId: string | null;
	assignee: TicketAssignee | null;
	createdAt: string;
	updatedAt: string;
};
