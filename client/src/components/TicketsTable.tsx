/** @format */

import type { Ticket } from "core";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
	type OnChangeFn,
	type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, StatusPill } from "./ticket-fields";

export type TicketRow = Pick<
	Ticket,
	| "id"
	| "subject"
	| "status"
	| "category"
	| "fromEmail"
	| "fromName"
	| "createdAt"
>;

type Props = {
	tickets: TicketRow[] | undefined;
	sorting: SortingState;
	onSortingChange: OnChangeFn<SortingState>;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

const SKELETON_ROW_COUNT = 5;

const columnHelper = createColumnHelper<TicketRow>();

const columns = [
	columnHelper.accessor("subject", {
		header: "Subject",
		cell: ({ row, getValue }) => (
			<Link
				to={`/tickets/${row.original.id}`}
				className='block max-w-md truncate text-[13px] font-medium text-foreground hover:underline underline-offset-2 decoration-foreground/30'>
				{getValue()}
			</Link>
		),
	}),
	columnHelper.accessor("fromEmail", {
		header: "Sender",
		cell: ({ row }) => {
			const t = row.original;
			return t.fromName ? (
				<div className='max-w-xs'>
					<div className='truncate text-[13px]'>{t.fromName}</div>
					<div className='truncate font-mono text-[11px] text-muted-foreground'>
						{t.fromEmail}
					</div>
				</div>
			) : (
				<div className='max-w-xs truncate font-mono text-[12px]'>
					{t.fromEmail}
				</div>
			);
		},
	}),
	columnHelper.accessor("status", {
		header: "Status",
		cell: (info) => <StatusPill status={info.getValue()} />,
	}),
	columnHelper.accessor("category", {
		header: "Category",
		cell: (info) => {
			const category = info.getValue();
			return (
				<span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
					{category ? CATEGORY_LABELS[category] : "—"}
				</span>
			);
		},
	}),
	columnHelper.accessor("createdAt", {
		header: "Created",
		cell: (info) => (
			<span className='font-mono text-[11px] tabular-nums text-muted-foreground'>
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
		<div className='overflow-x-auto'>
			<table className='w-full text-sm'>
				<thead className='text-left'>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr
							key={headerGroup.id}
							className='border-b hairline bg-surface-2/40'>
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
										className='px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
										{canSort ? (
											<button
												type='button'
												onClick={header.column.getToggleSortingHandler()}
												className='inline-flex items-center gap-1.5 transition-colors hover:text-foreground'>
												{headerNode}
												<span className='inline-flex flex-col items-center leading-none'>
													<ArrowUp
														strokeWidth={2.5}
														className={
															"size-2.5 " +
															(sortDir === "asc"
																? "text-foreground"
																: "text-muted-foreground/30")
														}
													/>
													<ArrowDown
														strokeWidth={2.5}
														className={
															"-mt-1 size-2.5 " +
															(sortDir === "desc"
																? "text-foreground"
																: "text-muted-foreground/30")
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
								<tr key={i} className='border-t hairline'>
									<td className='px-4 py-3'>
										<Skeleton className='h-4 w-64' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='mb-1 h-4 w-32' />
										<Skeleton className='h-3 w-48' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='h-4 w-20' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='h-3 w-16' />
									</td>
									<td className='px-4 py-3'>
										<Skeleton className='h-3 w-24' />
									</td>
								</tr>
							))
						: table.getRowModel().rows.map((row, idx) => (
								<tr
									key={row.id}
									className={
										"group/row relative border-t hairline transition-colors hover:bg-surface-2/60 " +
										(idx % 2 === 1 ? "bg-surface-2/20" : "")
									}>
									{row.getVisibleCells().map((cell, cellIdx) => (
										<td
											key={cell.id}
											className={
												"relative px-4 py-3 " +
												(cellIdx === 0
													? "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-foreground before:opacity-0 before:transition-opacity group-hover/row:before:opacity-100"
													: "")
											}>
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
