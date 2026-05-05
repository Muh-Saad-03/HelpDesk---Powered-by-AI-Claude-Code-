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

	const shortId = id ? (id.length <= 8 ? id : id.slice(-8)) : "";

	return (
		<>
			<NavBar />
			<main className='mx-auto max-w-6xl px-5 pt-6 pb-24 sm:px-8 lg:px-12'>
				{/* Breadcrumb-like header */}
				<div className='mb-6 flex items-center justify-between gap-3 font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
					<Link
						to='/tickets'
						variant='muted'
						aria-label='Back to tickets'
						className='inline-flex items-center gap-1 transition-colors hover:text-foreground'>
						<ChevronLeft className='size-3' />
						<span>Tickets</span>
					</Link>
					{shortId && (
						<>
							<span className='flex items-center gap-2'>
								<span aria-hidden>/</span>
								<span className='text-foreground'>#{shortId}</span>
							</span>
						</>
					)}
				</div>

				{isPending ? (
					<div className='animate-fade'>
						<Skeleton className='mb-3 h-10 w-3/4' />
						<Skeleton className='mb-8 h-4 w-1/2' />
						<div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_220px]'>
							<Skeleton className='h-72 w-full' />
							<Skeleton className='h-56 w-full' />
						</div>
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
					<article className='animate-rise'>
						<div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_240px]'>
							<div className='min-w-0'>
								<TicketDetail ticket={data} />
								<TicketReplies ticket={data} />
							</div>

							<aside className='lg:sticky lg:top-20 lg:self-start'>
								<UpdateTicket ticket={data} />
							</aside>
						</div>
					</article>
				)}
			</main>
		</>
	);
}
