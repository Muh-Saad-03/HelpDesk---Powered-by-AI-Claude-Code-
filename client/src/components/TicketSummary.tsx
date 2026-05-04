/** @format */

import axios, { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function TicketSummary({ ticketId }: { ticketId: string }) {
	const mutation = useMutation({
		mutationFn: async () => {
			const res = await axios.post<{ summary: string }>(
				`/api/tickets/${ticketId}/summarize`,
				{},
				{ withCredentials: true },
			);
			return res.data.summary;
		},
	});

	const error = mutation.error as AxiosError<{ error?: string }> | null;
	const errorMessage = error?.response?.data?.error ?? error?.message;

	const buttonLabel =
		mutation.isPending ? "Summarizing…"
		: mutation.data ? "Re-generate summary"
		: "Summarize";

	return (
		<section className='mt-4'>
			<Button
				type='button'
				variant='outline'
				size='sm'
				onClick={() => mutation.mutate()}
				disabled={mutation.isPending}>
				<Sparkles className='size-4' />
				{buttonLabel}
			</Button>

			{errorMessage && !mutation.isPending && (
				<Alert
					variant='destructive'
					className='mt-3'>
					<AlertDescription>
						Failed to summarize: {errorMessage}
					</AlertDescription>
				</Alert>
			)}

			{mutation.data && !mutation.isPending && (
				<div
					aria-label='Ticket summary'
					className='mt-3 rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap'>
					{mutation.data}
				</div>
			)}
		</section>
	);
}
