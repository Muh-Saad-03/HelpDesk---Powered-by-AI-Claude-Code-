import { type TicketCategory } from "core";
import { useUpdateTicket } from "@/lib/useUpdateTicket";
import { SELECT_CLASS } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "./ticket-fields";

export function CategorySelect({
	ticketId,
	currentCategory,
}: {
	ticketId: string;
	currentCategory: TicketCategory | null;
}) {
	const mutation = useUpdateTicket(ticketId);

	return (
		<div className='flex flex-wrap items-center gap-2'>
			<select
				className={`${SELECT_CLASS} w-full`}
				value={currentCategory ?? ""}
				disabled={mutation.isPending}
				onChange={(e) => {
					const value = e.target.value;
					mutation.mutate({
						category: value === "" ? null : (value as TicketCategory),
					});
				}}
				aria-label='Category'>
				<option value=''>Uncategorized</option>
				{CATEGORY_OPTIONS.map((opt) => (
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
					Failed to update category
				</span>
			) : null}
		</div>
	);
}
