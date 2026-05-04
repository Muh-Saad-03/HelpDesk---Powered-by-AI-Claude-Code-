/** @format */

import axios, { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { Ticket } from "core";
import { NavBar } from "../components/NavBar";
import { TicketDetail } from "../components/TicketDetail";
import { TicketReplies } from "../components/TicketReplies";
import { UpdateTicket } from "../components/UpdateTicket";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";

type TicketResponse = { ticket: Ticket };

export function TicketDetailPage() {
	const { id } = useParams<{ id: string }>();

	const { data, isPending, isError, error } = useQuery({
		queryKey: ["ticket", id],
		queryFn: async ({ signal }) => {
			const res = await axios.get<TicketResponse>(`/api/tickets/${id}`, {
				withCredentials: true,
				signal,
			});
			return res.data.ticket;
		},
		enabled: Boolean(id),
	});

	const isNotFound =
		isError && error instanceof AxiosError && error.response?.status === 404;

	return (
		<>
			<NavBar />
			<main className='mx-auto max-w-5xl p-8'>
				<Link
					to='/tickets'
					variant='muted'
					className='mb-6 inline-flex items-center gap-1 text-sm'>
					<ChevronLeft className='size-4' />
					Back to tickets
				</Link>

				{isPending ? (
					<div>
						<Skeleton className='mb-3 h-8 w-3/4' />
						<Skeleton className='mb-6 h-4 w-1/2' />
						<Skeleton className='h-40 w-full' />
					</div>
				) : isNotFound ? (
					<Alert variant='destructive'>
						<AlertDescription>Ticket not found.</AlertDescription>
					</Alert>
				) : isError ? (
					<Alert variant='destructive'>
						<AlertDescription>
							Failed to load ticket: {error.message}
						</AlertDescription>
					</Alert>
				) : (
					<article>
						<div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_120px]'>
							<div>
								<TicketDetail ticket={data} />
								<TicketReplies ticket={data} />
							</div>

							<UpdateTicket ticket={data} />
						</div>
					</article>
				)}
			</main>
		</>
	);
}
