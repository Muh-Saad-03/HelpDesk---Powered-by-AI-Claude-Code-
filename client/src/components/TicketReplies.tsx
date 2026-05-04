/** @format */

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createReplySchema,
	SenderType,
	type CreateReplyInput,
	type Ticket,
} from "core";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { TicketDetailSkeleton } from "./TicketDetailSkeleton";

type Reply = {
	id: string;
	body: string;
	createdAt: string;
	senderType: SenderType;
	authorId: string | null;
	author: { id: string; name: string; email: string } | null;
};

type RepliesResponse = { replies: Reply[] };

function replyAuthorLabel(reply: Reply, ticket: Ticket): string {
	if (reply.senderType === SenderType.AGENT) {
		return reply.author?.name ?? "Agent";
	}
	return ticket.fromName ?? ticket.fromEmail;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

const TEXTAREA_CLASS =
	"w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export function TicketReplies({ ticket }: { ticket: Ticket }) {
	const queryClient = useQueryClient();
	const repliesKey = ["ticket", ticket.id, "replies"];

	const repliesQuery = useQuery({
		queryKey: repliesKey,
		queryFn: async ({ signal }) => {
			const res = await axios.get<RepliesResponse>(
				`/api/tickets/${ticket.id}/replies`,
				{ withCredentials: true, signal },
			);
			return res.data.replies;
		},
	});

	const {
		control,
		handleSubmit,
		reset,
		formState: { isSubmitting },
	} = useForm<CreateReplyInput>({
		resolver: zodResolver(createReplySchema),
		defaultValues: { body: "" },
		mode: "onSubmit",
	});

	const mutation = useMutation({
		mutationFn: async (input: CreateReplyInput) => {
			await axios.post(`/api/tickets/${ticket.id}/replies`, input, {
				withCredentials: true,
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: repliesKey });
			reset({ body: "" });
		},
	});

	const submitError = mutation.error as AxiosError<{ error?: string }> | null;
	const submitErrorMessage =
		submitError?.response?.data?.error ?? submitError?.message;

	const onSubmit = handleSubmit((values) => mutation.mutate(values));

	return (
		<section className='mt-8'>
			<h2 className='mb-3 text-sm font-medium text-muted-foreground'>
				Replies
			</h2>

			{repliesQuery.isPending ? (
				<TicketDetailSkeleton />
			) : repliesQuery.isError ? (
				<Alert variant='destructive'>
					<AlertDescription>
						Failed to load replies: {repliesQuery.error.message}
					</AlertDescription>
				</Alert>
			) : repliesQuery.data.length === 0 ? (
				<p className='text-sm text-muted-foreground'>No replies yet.</p>
			) : (
				<ol className='space-y-3'>
					{repliesQuery.data.map((reply) => {
						const isAgent = reply.senderType === SenderType.AGENT;
						return (
							<li
								key={reply.id}
								className='rounded-lg border bg-card p-4 text-sm'>
								<div className='mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
									<div className='flex items-center gap-2'>
										<span className='font-medium'>
											{replyAuthorLabel(reply, ticket)}
										</span>
										<span
											className={
												isAgent
													? "rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary"
													: "rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
											}>
											{isAgent ? "Agent" : "Customer"}
										</span>
									</div>
									<time
										dateTime={reply.createdAt}
										className='text-xs text-muted-foreground'>
										{dateFormatter.format(new Date(reply.createdAt))}
									</time>
								</div>
								<div className='whitespace-pre-wrap'>{reply.body}</div>
							</li>
						);
					})}
				</ol>
			)}

			<form
				onSubmit={onSubmit}
				noValidate
				className='mt-6'>
				<Controller
					name='body'
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor='reply-body'>Add a reply</FieldLabel>
							<textarea
								{...field}
								id='reply-body'
								rows={4}
								placeholder='Write a reply…'
								aria-invalid={fieldState.invalid}
								disabled={mutation.isPending}
								className={TEXTAREA_CLASS}
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				{submitErrorMessage && !mutation.isPending && (
					<Alert
						variant='destructive'
						className='mt-3'>
						<AlertDescription>{submitErrorMessage}</AlertDescription>
					</Alert>
				)}

				<div className='mt-3 flex justify-end'>
					<Button
						type='submit'
						disabled={mutation.isPending || isSubmitting}>
						{mutation.isPending ? "Sending…" : "Send reply"}
					</Button>
				</div>
			</form>
		</section>
	);
}
