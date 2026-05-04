/** @format */

import axios, { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TicketCategory, TicketStatus } from "core";
import { NavBar } from "../components/NavBar";
import { CATEGORY_LABELS, StatusPill } from "../components/ticket-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";

type TicketDetail = {
	id: string;
	subject: string;
	body: string;
	status: TicketStatus;
	category: TicketCategory | null;
	fromEmail: string;
	fromName: string | null;
	assigneeId: string | null;
	assignee: { id: string; name: string; email: string } | null;
	createdAt: string;
	updatedAt: string;
};

type TicketResponse = { ticket: TicketDetail };

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

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
			<main className='mx-auto max-w-3xl p-8'>
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
						<header className='mb-6'>
							<h1 className='mb-3 text-2xl font-semibold tracking-tight'>
								{data.subject}
							</h1>
							<div className='flex flex-wrap items-center gap-2'>
								<StatusPill status={data.status} />
								<span className='text-xs text-muted-foreground'>
									{data.category ? CATEGORY_LABELS[data.category] : "Uncategorized"}
								</span>
							</div>
						</header>

						<dl className='mb-6 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[120px_1fr]'>
							<dt className='text-muted-foreground'>From</dt>
							<dd>
								{data.fromName ? (
									<>
										<span>{data.fromName}</span>{" "}
										<span className='text-muted-foreground'>
											&lt;{data.fromEmail}&gt;
										</span>
									</>
								) : (
									data.fromEmail
								)}
							</dd>

							<dt className='text-muted-foreground'>Assignee</dt>
							<dd>
								{data.assignee ? (
									<>
										<span>{data.assignee.name}</span>{" "}
										<span className='text-muted-foreground'>
											&lt;{data.assignee.email}&gt;
										</span>
									</>
								) : (
									<span className='text-muted-foreground'>Unassigned</span>
								)}
							</dd>

							<dt className='text-muted-foreground'>Created</dt>
							<dd>{dateFormatter.format(new Date(data.createdAt))}</dd>

							<dt className='text-muted-foreground'>Updated</dt>
							<dd>{dateFormatter.format(new Date(data.updatedAt))}</dd>
						</dl>

						<section>
							<h2 className='mb-2 text-sm font-medium text-muted-foreground'>
								Message
							</h2>
							<div className='rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap'>
								{data.body}
							</div>
						</section>
					</article>
				)}
			</main>
		</>
	);
}
