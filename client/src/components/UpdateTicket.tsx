/** @format */

import type { Ticket } from "core";
import { AssigneeSelect } from "./AssigneeSelect";
import { CategorySelect } from "./CategorySelect";
import { StatusSelect } from "./StatusSelect";

export function UpdateTicket({ ticket }: { ticket: Ticket }) {
	return (
		<aside className='space-y-4 text-sm'>
			<div>
				<div className='mb-1 text-xs text-muted-foreground'>Status</div>
				<StatusSelect
					ticketId={ticket.id}
					currentStatus={ticket.status}
				/>
			</div>
			<div>
				<div className='mb-1 text-xs text-muted-foreground'>Category</div>
				<CategorySelect
					ticketId={ticket.id}
					currentCategory={ticket.category}
				/>
			</div>
			<div>
				<div className='mb-1 text-xs text-muted-foreground'>Assignee</div>
				<AssigneeSelect
					ticketId={ticket.id}
					currentAssigneeId={ticket.assigneeId}
				/>
			</div>
		</aside>
	);
}
