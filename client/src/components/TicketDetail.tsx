/** @format */

import type { Ticket } from "core";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

export function TicketDetail({ ticket }: { ticket: Ticket }) {
	return (
		<>
			<header className='mb-6'>
				<h1 className='text-2xl font-semibold tracking-tight'>
					{ticket.subject}
				</h1>
			</header>

			<dl className='mb-6 space-y-2 text-sm'>
				<div className='flex flex-wrap gap-x-2'>
					<dt className='text-muted-foreground'>From:</dt>
					<dd>
						{ticket.fromName ? (
							<>
								<span>{ticket.fromName}</span>{" "}
								<span className='text-muted-foreground'>
									&lt;{ticket.fromEmail}&gt;
								</span>
							</>
						) : (
							ticket.fromEmail
						)}
					</dd>
				</div>

				<div className='flex flex-wrap gap-x-2'>
					<dt className='text-muted-foreground'>Created:</dt>
					<dd>{dateFormatter.format(new Date(ticket.createdAt))}</dd>
				</div>

				<div className='flex flex-wrap gap-x-2'>
					<dt className='text-muted-foreground'>Updated:</dt>
					<dd>{dateFormatter.format(new Date(ticket.updatedAt))}</dd>
				</div>
			</dl>

			<section className='rounded-lg border bg-card p-4 text-sm'>
				<h2 className='mb-3 text-xs font-medium text-muted-foreground'>
					Message
				</h2>
				<div className='mb-3 font-medium'>
					{ticket.fromName ?? ticket.fromEmail}
				</div>
				<div className='whitespace-pre-wrap'>{ticket.body}</div>
			</section>
		</>
	);
}
