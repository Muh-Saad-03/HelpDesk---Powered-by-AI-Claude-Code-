/** @format */

import type { Ticket } from "core";
import { AssigneeSelect } from "./AssigneeSelect";
import { CategorySelect } from "./CategorySelect";
import { StatusSelect } from "./StatusSelect";

export function UpdateTicket({ ticket }: { ticket: Ticket }) {
	return (
		<aside className='surface-panel overflow-hidden text-sm'>
			<div className='border-b hairline px-4 py-2.5'>
				<span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
					Properties
				</span>
			</div>
			<div className='divide-y divide-[var(--hairline)]'>
				<PropertyRow label='Status'>
					<StatusSelect
						ticketId={ticket.id}
						currentStatus={ticket.status}
					/>
				</PropertyRow>
				<PropertyRow label='Category'>
					<CategorySelect
						ticketId={ticket.id}
						currentCategory={ticket.category}
					/>
				</PropertyRow>
				<PropertyRow label='Assignee'>
					<AssigneeSelect
						ticketId={ticket.id}
						currentAssigneeId={ticket.assigneeId}
					/>
				</PropertyRow>
			</div>
		</aside>
	);
}

function PropertyRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className='space-y-1.5 px-4 py-3'>
			<div className='font-mono text-[9px] tracking-widest uppercase text-muted-foreground'>
				{label}
			</div>
			{children}
		</div>
	);
}
