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
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { NavBar } from "../components/NavBar";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "../components/ticket-fields";
import { TicketsTable, type TicketRow } from "../components/TicketsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
	const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "">(
		"",
	);
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);

	useEffect(() => {
		// Debounced search: when typing settles, push to the query AND reset to
		// the first page so the user doesn't end up on a stale empty page.
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
		// Keep the previous page visible while fetching the next one — avoids a
		// loading flash on every Prev/Next click.
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
			<main className='mx-auto max-w-6xl p-8'>
				<div className='mb-6 flex items-center justify-between gap-4'>
					<h1 className='text-2xl font-semibold tracking-tight'>Tickets</h1>
				</div>

				<div className='mb-6 flex flex-wrap items-center gap-3'>
					<div className='relative max-w-xs flex-1'>
						<Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							type='search'
							placeholder='Search subject or sender'
							className='pl-8'
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							aria-label='Search tickets'
						/>
					</div>
					<label className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
						Status
						<select
							className={SELECT_CLASS}
							value={statusFilter}
							onChange={(e) =>
								handleStatusChange(e.target.value as TicketStatus | "")
							}
							aria-label='Filter by status'>
							<option value=''>All</option>
							{STATUS_OPTIONS.map((opt) => (
								<option
									key={opt.value}
									value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					<label className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
						Category
						<select
							className={SELECT_CLASS}
							value={categoryFilter}
							onChange={(e) =>
								handleCategoryChange(e.target.value as TicketCategory | "")
							}
							aria-label='Filter by category'>
							<option value=''>All</option>
							{CATEGORY_OPTIONS.map((opt) => (
								<option
									key={opt.value}
									value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					{hasActiveFilters ? (
						<Button
							type='button'
							size='xs'
							variant='ghost'
							onClick={() => {
								setStatusFilter("");
								setCategoryFilter("");
								setSearchInput("");
								setPage(1);
							}}>
							Clear filters
						</Button>
					) : null}
				</div>

				{isError ? (
					<Alert variant='destructive'>
						<AlertDescription>
							Failed to load tickets: {error.message}
						</AlertDescription>
					</Alert>
				) : isPending ? (
					<TicketsTable
						tickets={undefined}
						sorting={sorting}
						onSortingChange={handleSortingChange}
					/>
				) : tickets && tickets.length === 0 ? (
					<p className='text-muted-foreground'>
						{hasActiveFilters
							? "No tickets match the current filters."
							: "No tickets yet."}
					</p>
				) : (
					<>
						<TicketsTable
							tickets={tickets}
							sorting={sorting}
							onSortingChange={handleSortingChange}
						/>

						<div
							className={
								"mt-4 flex flex-wrap items-center justify-between gap-3 text-sm " +
								(isPlaceholderData ? "opacity-60" : "")
							}>
							<div className='text-muted-foreground'>
								{total === 0
									? "No results"
									: `Showing ${startIndex}–${endIndex} of ${total}`}
							</div>
							<div className='flex items-center gap-3'>
								<label className='flex items-center gap-2 text-xs text-muted-foreground'>
									Per page
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
											<option
												key={n}
												value={n}>
												{n}
											</option>
										))}
									</select>
								</label>
								<div className='flex items-center gap-2'>
									<Button
										type='button'
										size='icon-sm'
										variant='outline'
										aria-label='Previous page'
										disabled={page <= 1}
										onClick={() => setPage((p) => Math.max(1, p - 1))}>
										<ChevronLeft className='size-4' />
									</Button>
									<span className='text-muted-foreground'>
										Page {page} of {totalPages}
									</span>
									<Button
										type='button'
										size='icon-sm'
										variant='outline'
										aria-label='Next page'
										disabled={page >= totalPages}
										onClick={() =>
											setPage((p) => Math.min(totalPages, p + 1))
										}>
										<ChevronRight className='size-4' />
									</Button>
								</div>
							</div>
						</div>
					</>
				)}
			</main>
		</>
	);
}
