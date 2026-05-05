/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import {
	PAGE_SIZE_OPTIONS,
	TicketCategory,
	TicketStatus,
	type PageSizeOption,
	type TicketSortField,
} from "core";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { NavBar } from "../components/NavBar";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "../components/ticket-fields";
import { TicketsTable, type TicketRow } from "../components/TicketsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { SELECT_CLASS } from "@/lib/utils";

type TicketsResponse = {
	tickets: TicketRow[];
	total: number;
	page: number;
	pageSize: number;
};

const DEFAULT_SORTING: SortingState = [{ id: "createdAt", desc: true }];
const DEFAULT_PAGE_SIZE: PageSizeOption = 10;

export function TicketsPage() {
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
	const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
	const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "">("");
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);

	useEffect(() => {
		const handle = setTimeout(() => {
			setSearchQuery(searchInput.trim());
			setPage(1);
		}, 300);
		return () => clearTimeout(handle);
	}, [searchInput]);

	const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
		setSorting((prev) => {
			const next = typeof updater === "function" ? updater(prev) : updater;
			if (next.length === 0 && prev.length > 0) {
				return [{ id: prev[0]!.id, desc: !prev[0]!.desc }];
			}
			return next;
		});
		setPage(1);
	};

	const handleStatusChange = (next: TicketStatus | "") => {
		setStatusFilter(next);
		setPage(1);
	};
	const handleCategoryChange = (next: TicketCategory | "") => {
		setCategoryFilter(next);
		setPage(1);
	};
	const handlePageSizeChange = (next: PageSizeOption) => {
		setPageSize(next);
		setPage(1);
	};

	const sortBy = (sorting[0]?.id ?? "createdAt") as TicketSortField;
	const sortOrder = sorting[0]?.desc ? "desc" : "asc";

	const { data, isPending, isError, error, isPlaceholderData } = useQuery({
		queryKey: [
			"tickets",
			sortBy,
			sortOrder,
			statusFilter,
			categoryFilter,
			searchQuery,
			page,
			pageSize,
		],
		queryFn: async ({ signal }) => {
			const res = await axios.get<TicketsResponse>("/api/tickets", {
				withCredentials: true,
				signal,
				params: {
					sortBy,
					sortOrder,
					page,
					pageSize,
					...(statusFilter && { status: statusFilter }),
					...(categoryFilter && { category: categoryFilter }),
					...(searchQuery && { q: searchQuery }),
				},
			});
			return res.data;
		},
		placeholderData: keepPreviousData,
	});

	const tickets = data?.tickets;
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	const hasActiveFilters =
		statusFilter !== "" || categoryFilter !== "" || searchInput !== "";

	const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const endIndex = Math.min(page * pageSize, total);

	return (
		<>
			<NavBar />
			<main className='mx-auto max-w-7xl px-5 pt-8 pb-24 sm:px-8 lg:px-12'>
				{/* Header */}
				<div className='mb-8 flex flex-wrap items-end justify-between gap-6 animate-rise'>
					<div>
						<span className='font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground'>
							── Section 02 / Queue
						</span>
						<h1 className='mt-3 text-4xl font-semibold tracking-tight text-display sm:text-[2.75rem]'>
							Tickets
							{!isPending && (
								<span className='ml-3 font-mono text-2xl font-medium tabular-nums text-muted-foreground/60'>
									{total.toLocaleString()}
								</span>
							)}
						</h1>
					</div>
					<div className='flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
						<span>Sort</span>
						<span className='text-foreground'>{sortBy}</span>
						<span aria-hidden className='h-3 w-px bg-border' />
						<span>{sortOrder === "desc" ? "↓" : "↑"}</span>
					</div>
				</div>

				{/* Filter bar — bordered toolbar */}
				<div className='mb-6 flex flex-wrap items-center gap-2 rounded-lg border hairline bg-surface px-3 py-2.5 animate-rise'
					style={{ animationDelay: "120ms" }}>
					<div className='relative max-w-xs flex-1 min-w-[180px]'>
						<Search className='pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground' />
						<Input
							type='search'
							placeholder='Search subject or sender…'
							className='h-8 border-0 bg-transparent pl-7 font-mono text-[12px] focus-visible:ring-0'
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							aria-label='Search tickets'
						/>
					</div>
					<span aria-hidden className='h-5 w-px bg-border' />
					<label className='flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
						<span>Status</span>
						<select
							className={SELECT_CLASS}
							value={statusFilter}
							onChange={(e) =>
								handleStatusChange(e.target.value as TicketStatus | "")
							}
							aria-label='Filter by status'>
							<option value=''>All</option>
							{STATUS_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					<label className='flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
						<span>Category</span>
						<select
							className={SELECT_CLASS}
							value={categoryFilter}
							onChange={(e) =>
								handleCategoryChange(e.target.value as TicketCategory | "")
							}
							aria-label='Filter by category'>
							<option value=''>All</option>
							{CATEGORY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					{hasActiveFilters && (
						<button
							type='button'
							aria-label='Clear filters'
							onClick={() => {
								setStatusFilter("");
								setCategoryFilter("");
								setSearchInput("");
								setPage(1);
							}}
							className='ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] tracking-widest uppercase text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'>
							<X className='size-3' />
							Clear
						</button>
					)}
				</div>

				{isError ? (
					<Alert variant='destructive'>
						<AlertDescription>
							Failed to load tickets: {error.message}
						</AlertDescription>
					</Alert>
				) : isPending ? (
					<div className='surface-panel overflow-hidden'>
						<TicketsTable
							tickets={undefined}
							sorting={sorting}
							onSortingChange={handleSortingChange}
						/>
					</div>
				) : tickets && tickets.length === 0 ? (
					<div className='surface-panel grid place-items-center px-8 py-24 text-center'>
						<div>
							<div className='mx-auto mb-4 size-12 rounded-md border-2 border-dashed border-foreground/20' />
							<p className='text-[14px] font-medium'>
								{hasActiveFilters
									? "No tickets match the current filters."
									: "No tickets yet."}
							</p>
							<p className='mt-1 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
								{hasActiveFilters ? "Try clearing filters" : "All clear"}
							</p>
						</div>
					</div>
				) : (
					<>
						<div className='surface-panel overflow-hidden animate-rise'
							style={{ animationDelay: "200ms" }}>
							<TicketsTable
								tickets={tickets}
								sorting={sorting}
								onSortingChange={handleSortingChange}
							/>
						</div>

						<div
							className={
								"mt-4 flex flex-wrap items-center justify-between gap-3 " +
								(isPlaceholderData ? "opacity-60" : "")
							}>
							<div className='font-mono text-[11px] tabular-nums text-muted-foreground'>
								{total === 0
									? "No results"
									: `Showing ${startIndex}–${endIndex} of ${total}`}
							</div>
							<div className='flex items-center gap-3'>
								<label className='flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
									<span>Per page</span>
									<select
										className={SELECT_CLASS}
										value={pageSize}
										onChange={(e) =>
											handlePageSizeChange(
												Number(e.target.value) as PageSizeOption,
											)
										}
										aria-label='Rows per page'>
										{PAGE_SIZE_OPTIONS.map((n) => (
											<option key={n} value={n}>
												{n}
											</option>
										))}
									</select>
								</label>
								<div className='inline-flex items-center rounded-md border hairline bg-surface'>
									<button
										type='button'
										aria-label='Previous page'
										disabled={page <= 1}
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										className='grid size-7 place-items-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40'>
										<ChevronLeft className='size-3.5' />
									</button>
									<span className='border-x hairline px-3 font-mono text-[11px] tabular-nums text-foreground'>
										{`Page ${page} of ${totalPages}`}
									</span>
									<button
										type='button'
										aria-label='Next page'
										disabled={page >= totalPages}
										onClick={() =>
											setPage((p) => Math.min(totalPages, p + 1))
										}
										className='grid size-7 place-items-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40'>
										<ChevronRight className='size-3.5' />
									</button>
								</div>
							</div>
						</div>
					</>
				)}
			</main>
		</>
	);
}
