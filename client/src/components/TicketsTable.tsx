/** @format */

import { TicketCategory, TicketStatus } from "core";
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

export function TicketsTable({ tickets }: Props) {
	const isLoading = tickets === undefined;

	return (
		<div>
			<table className='w-full text-sm'>
				<thead className='text-left'>
					<tr className='border-b'>
						<th className='px-4 py-2 font-medium'>Subject</th>
						<th className='px-4 py-2 font-medium'>Sender</th>
						<th className='px-4 py-2 font-medium'>Status</th>
						<th className='px-4 py-2 font-medium'>Category</th>
						<th className='px-4 py-2 font-medium'>Created</th>
					</tr>
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
						: tickets.map((t) => (
								<tr
									key={t.id}
									className='border-t'>
									<td className='max-w-md truncate px-4 py-2 font-medium'>
										{t.subject}
									</td>
									<td className='max-w-xs px-4 py-2'>
										{t.fromName ? (
											<>
												<div className='truncate'>{t.fromName}</div>
												<div className='truncate text-xs text-muted-foreground'>
													{t.fromEmail}
												</div>
											</>
										) : (
											<div className='truncate'>{t.fromEmail}</div>
										)}
									</td>
									<td className='px-4 py-2'>
										<span
											className={
												"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
												STATUS_CLASSES[t.status]
											}>
											{t.status.toLowerCase()}
										</span>
									</td>
									<td className='px-4 py-2 text-muted-foreground'>
										{t.category ? CATEGORY_LABELS[t.category] : "—"}
									</td>
									<td className='px-4 py-2 text-muted-foreground'>
										{dateFormatter.format(new Date(t.createdAt))}
									</td>
								</tr>
							))}
				</tbody>
			</table>
		</div>
	);
}
