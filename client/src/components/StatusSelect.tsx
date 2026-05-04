import { type TicketStatus } from "core";
import { useUpdateTicket } from "@/lib/useUpdateTicket";
import { SELECT_CLASS } from "@/lib/utils";
import { STATUS_OPTIONS } from "./ticket-fields";

export function StatusSelect({
	ticketId,
	currentStatus,
}: {
	ticketId: string;
	currentStatus: TicketStatus;
}) {
	const mutation = useUpdateTicket(ticketId);

	return (
		<div className='flex flex-wrap items-center gap-2'>
			<select
				className={`${SELECT_CLASS} w-full`}
				value={currentStatus}
				disabled={mutation.isPending}
				onChange={(e) =>
					mutation.mutate({ status: e.target.value as TicketStatus })
				}
				aria-label='Status'>
				{STATUS_OPTIONS.map((opt) => (
					<option
						key={opt.value}
						value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
			{mutation.isPending ? (
				<span className='text-xs text-muted-foreground'>Saving…</span>
			) : mutation.isError ? (
				<span
					role='alert'
					className='text-xs text-destructive'>
					Failed to update status
				</span>
			) : null}
		</div>
	);
}
