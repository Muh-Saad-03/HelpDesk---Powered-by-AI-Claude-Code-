/** @format */

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "../components/NavBar";
import { TicketsTable, type Ticket } from "../components/TicketsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TicketsResponse = { tickets: Ticket[] };

export function TicketsPage() {
	const {
		data: tickets,
		isPending,
		isError,
		error,
	} = useQuery({
		queryKey: ["tickets"],
		queryFn: async ({ signal }) => {
			const res = await axios.get<TicketsResponse>("/api/tickets", {
				withCredentials: true,
				signal,
			});
			return res.data.tickets;
		},
	});

	return (
		<>
			<NavBar />
			<main className='mx-auto max-w-6xl p-8'>
				<div className='mb-6 flex items-center justify-between gap-4'>
					<h1 className='text-2xl font-semibold tracking-tight'>Tickets</h1>
				</div>

				{isError ? (
					<Alert variant='destructive'>
						<AlertDescription>
							Failed to load tickets: {error.message}
						</AlertDescription>
					</Alert>
				) : isPending ? (
					<TicketsTable tickets={undefined} />
				) : tickets.length === 0 ? (
					<p className='text-muted-foreground'>No tickets yet.</p>
				) : (
					<TicketsTable tickets={tickets} />
				)}
			</main>
		</>
	);
}
