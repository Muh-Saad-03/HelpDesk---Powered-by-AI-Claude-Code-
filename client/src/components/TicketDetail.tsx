/** @format */

import type { Ticket } from "core";
import { Mail } from "lucide-react";
import { TicketSummary } from "./TicketSummary";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

export function TicketDetail({ ticket }: { ticket: Ticket }) {
	return (
		<>
			<header className='mb-6'>
				<span className='font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground'>
					Ticket / Thread
				</span>
				<h1 className='mt-2 text-3xl font-semibold tracking-tight text-display sm:text-[2.25rem]'>
					{ticket.subject}
				</h1>
			</header>

			<dl className='mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-md border hairline bg-hairline sm:grid-cols-3'>
				<MetaCell label='From'>
					{ticket.fromName ? (
						<>
							<span>{ticket.fromName}</span>{" "}
							<span className='font-mono text-[11px] text-muted-foreground'>
								&lt;{ticket.fromEmail}&gt;
							</span>
						</>
					) : (
						<span className='font-mono text-[12px]'>{ticket.fromEmail}</span>
					)}
				</MetaCell>
				<MetaCell label='Created'>
					<span className='font-mono text-[12px] tabular-nums'>
						{dateFormatter.format(new Date(ticket.createdAt))}
					</span>
				</MetaCell>
				<MetaCell label='Updated'>
					<span className='font-mono text-[12px] tabular-nums'>
						{dateFormatter.format(new Date(ticket.updatedAt))}
					</span>
				</MetaCell>
			</dl>

			<section className='surface-panel overflow-hidden text-sm'>
				<div className='flex items-center justify-between border-b hairline px-4 py-2.5'>
					<div className='flex items-center gap-2'>
						<Mail className='size-3.5 text-muted-foreground' />
						<span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
							Initial message
						</span>
					</div>
					<span className='font-mono text-[10px] tabular-nums text-muted-foreground'>
						{dateFormatter.format(new Date(ticket.createdAt))}
					</span>
				</div>
				<div className='px-5 py-4'>
					<div className='mb-3 flex items-center gap-2'>
						<div className='grid size-7 place-items-center rounded-full bg-muted font-mono text-[10px] font-semibold tracking-wide'>
							{(ticket.fromName ?? ticket.fromEmail).slice(0, 2).toUpperCase()}
						</div>
						<div className='font-medium'>
							{ticket.fromName ?? ticket.fromEmail}
						</div>
					</div>
					<div className='whitespace-pre-wrap leading-relaxed'>{ticket.body}</div>
				</div>
			</section>

			<TicketSummary ticketId={ticket.id} />
		</>
	);
}

function MetaCell({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className='bg-surface px-4 py-3'>
			<dt className='font-mono text-[9px] tracking-widest uppercase text-muted-foreground'>
				{label}
			</dt>
			<dd className='mt-1 text-sm'>{children}</dd>
		</div>
	);
}
