/** @format */

import { TicketCategory, TicketStatus } from "core";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
	type OnChangeFn,
	type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export type Ticket = {
	id: string;
	subject: string;
	status: TicketStatus;
	category: TicketCategory | null;
	fromEmail: string;
	fromName: string | null;
	createdAt: string;
};

type Props = {
	tickets: Ticket[] | undefined;
	sorting: SortingState;
	onSortingChange: OnChangeFn<SortingState>;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

const SKELETON_ROW_COUNT = 5;

const STATUS_CLASSES: Record<TicketStatus, string> = {
	[TicketStatus.OPEN]: "bg-primary/10 text-primary",
	[TicketStatus.RESOLVED]: "bg-emerald-500/10 text-emerald-700",
	[TicketStatus.CLOSED]: "bg-muted text-muted-foreground",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
	[TicketCategory.GENERAL_QUESTION]: "General",
	[TicketCategory.TECHNICAL_QUESTION]: "Technical",
	[TicketCategory.REFUND_REQUEST]: "Refund",
};

const columnHelper = createColumnHelper<Ticket>();

const columns = [
	columnHelper.accessor("subject", {
		header: "Subject",
		cell: (info) => (
			<span className='block max-w-md truncate font-medium'>
				{info.getValue()}
			</span>
		),
	}),
	columnHelper.accessor("fromEmail", {
		// Sender column. fromName is nullable, so we sort on fromEmail — more
		// reliable signal. Cell still renders the name above the email.
		header: "Sender",
		cell: ({ row }) => {
			const t = row.original;
			return t.fromName ? (
				<div className='max-w-xs'>
					<div className='truncate'>{t.fromName}</div>
					<div className='truncate text-xs text-muted-foreground'>
						{t.fromEmail}
					</div>
				</div>
			) : (
				<div className='max-w-xs truncate'>{t.fromEmail}</div>
			);
		},
	}),
	columnHelper.accessor("status", {
		header: "Status",
		cell: (info) => {
			const status = info.getValue();
			return (
				<span
					className={
						"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
						STATUS_CLASSES[status]
					}>
					{status.toLowerCase()}
				</span>
			);
		},
	}),
	columnHelper.accessor("category", {
		header: "Category",
		cell: (info) => {
			const category = info.getValue();
			return (
				<span className='text-muted-foreground'>
					{category ? CATEGORY_LABELS[category] : "—"}
				</span>
			);
		},
	}),
	columnHelper.accessor("createdAt", {
		header: "Created",
		cell: (info) => (
			<span className='text-muted-foreground'>
				{dateFormatter.format(new Date(info.getValue()))}
			</span>
		),
	}),
];

export function TicketsTable({ tickets, sorting, onSortingChange }: Props) {
	const isLoading = tickets === undefined;

	const table = useReactTable({
		data: tickets ?? [],
		columns,
		state: { sorting },
		onSortingChange,
		manualSorting: true,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<table className='w-full text-sm'>
				<thead className='text-left'>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr
							key={headerGroup.id}
							className='border-b'>
							{headerGroup.headers.map((header) => {
								const sortDir = header.column.getIsSorted();
								const canSort = header.column.getCanSort();
								const headerNode = flexRender(
									header.column.columnDef.header,
									header.getContext(),
								);
								return (
									<th
										key={header.id}
										className='px-4 py-2 font-medium'>
										{canSort ? (
											<button
												type='button'
												onClick={header.column.getToggleSortingHandler()}
												className='inline-flex items-center gap-1 font-medium hover:text-foreground/80'>
												{headerNode}
												<span className='inline-flex flex-col items-center leading-none'>
													<ArrowUp
														strokeWidth={2.5}
														className={
															"size-3 " +
															(sortDir === "asc"
																? "text-foreground"
																: "text-muted-foreground/40")
														}
													/>
													<ArrowDown
														strokeWidth={2.5}
														className={
															"-mt-1.5 size-3 " +
															(sortDir === "desc"
																? "text-foreground"
																: "text-muted-foreground/40")
														}
													/>
												</span>
											</button>
										) : (
											headerNode
										)}
									</th>
								);
							})}
						</tr>
					))}
				</thead>
				<tbody>
					{isLoading
						? Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
								<tr
									key={i}
									className='border-t'>
									<td className='px-4 py-2'>
										<Skeleton className='h-4 w-64' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='mb-1 h-4 w-32' />
										<Skeleton className='h-3 w-48' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='h-5 w-16 rounded-full' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='h-4 w-20' />
									</td>
									<td className='px-4 py-2'>
										<Skeleton className='h-4 w-32' />
									</td>
								</tr>
							))
						: table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className='border-t'>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											className='px-4 py-2'>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							))}
				</tbody>
			</table>
		</div>
	);
}
