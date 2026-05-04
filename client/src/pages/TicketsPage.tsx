/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { TicketCategory, TicketStatus, type TicketSortField } from "core";
import { Search } from "lucide-react";
import { NavBar } from "../components/NavBar";
import { TicketsTable, type Ticket } from "../components/TicketsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TicketsResponse = { tickets: Ticket[] };

const DEFAULT_SORTING: SortingState = [{ id: "createdAt", desc: true }];

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
	{ value: TicketStatus.OPEN, label: "Open" },
	{ value: TicketStatus.RESOLVED, label: "Resolved" },
	{ value: TicketStatus.CLOSED, label: "Closed" },
];

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
	{ value: TicketCategory.GENERAL_QUESTION, label: "General" },
	{ value: TicketCategory.TECHNICAL_QUESTION, label: "Technical" },
	{ value: TicketCategory.REFUND_REQUEST, label: "Refund" },
];

const SELECT_CLASS =
	"h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function TicketsPage() {
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
	const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
	const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "">(
		"",
	);
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		// Debounce: wait 300ms after the user stops typing before refetching.
		const handle = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
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
	};

	const sortBy = (sorting[0]?.id ?? "createdAt") as TicketSortField;
	const sortOrder = sorting[0]?.desc ? "desc" : "asc";

	const {
		data: tickets,
		isPending,
		isError,
		error,
	} = useQuery({
		queryKey: [
			"tickets",
			sortBy,
			sortOrder,
			statusFilter,
			categoryFilter,
			searchQuery,
		],
		queryFn: async ({ signal }) => {
			const res = await axios.get<TicketsResponse>("/api/tickets", {
				withCredentials: true,
				signal,
				params: {
					sortBy,
					sortOrder,
					...(statusFilter && { status: statusFilter }),
					...(categoryFilter && { category: categoryFilter }),
					...(searchQuery && { q: searchQuery }),
				},
			});
			return res.data.tickets;
		},
	});

	const hasActiveFilters =
		statusFilter !== "" || categoryFilter !== "" || searchInput !== "";

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
								setStatusFilter(e.target.value as TicketStatus | "")
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
								setCategoryFilter(e.target.value as TicketCategory | "")
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
				) : tickets.length === 0 ? (
					<p className='text-muted-foreground'>
						{hasActiveFilters
							? "No tickets match the current filters."
							: "No tickets yet."}
					</p>
				) : (
					<TicketsTable
						tickets={tickets}
						sorting={sorting}
						onSortingChange={handleSortingChange}
					/>
				)}
			</main>
		</>
	);
}
