/** @format */

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createReplySchema,
	SenderType,
	type CreateReplyInput,
	type PolishReplyInput,
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
	"w-full min-w-0 rounded-md border hairline bg-surface px-3 py-2.5 text-sm leading-relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

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
		getValues,
		setValue,
		watch,
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

	const polishMutation = useMutation({
		mutationFn: async (input: PolishReplyInput) => {
			const res = await axios.post<{ body: string }>(
				`/api/tickets/${ticket.id}/polish-reply`,
				input,
				{ withCredentials: true },
			);
			return res.data.body;
		},
		onSuccess: (polished) => {
			setValue("body", polished, {
				shouldDirty: true,
				shouldValidate: false,
			});
		},
	});

	const submitError = mutation.error as AxiosError<{ error?: string }> | null;
	const submitErrorMessage =
		submitError?.response?.data?.error ?? submitError?.message;

	const polishError = polishMutation.error as AxiosError<{
		error?: string;
	}> | null;
	const polishErrorMessage =
		polishError?.response?.data?.error ?? polishError?.message;

	const onSubmit = handleSubmit((values) => mutation.mutate(values));

	const onPolish = () => {
		polishMutation.mutate({ body: getValues("body").trim() });
	};

	const isReplyEmpty = watch("body").trim().length === 0;

	return (
		<section className='mt-10'>
			<div className='mb-4 flex items-center gap-3'>
				<span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
					Thread
				</span>
				<span aria-hidden className='h-px flex-1 bg-hairline' />
				{!repliesQuery.isPending &&
					!repliesQuery.isError &&
					repliesQuery.data && (
						<span className='font-mono text-[10px] tabular-nums text-muted-foreground'>
							{repliesQuery.data.length} {repliesQuery.data.length === 1 ? "reply" : "replies"}
						</span>
					)}
			</div>

			{repliesQuery.isPending ? (
				<TicketDetailSkeleton />
			) : repliesQuery.isError ? (
				<Alert variant='destructive'>
					<AlertDescription>
						Failed to load replies: {repliesQuery.error.message}
					</AlertDescription>
				</Alert>
			) : repliesQuery.data.length === 0 ? (
				<p className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
					No replies yet.
				</p>
			) : (
				<ol className='relative space-y-4'>
					<span
						aria-hidden
						className='pointer-events-none absolute top-3 bottom-3 left-[14px] w-px bg-hairline'
					/>
					{repliesQuery.data.map((reply) => {
						const isAgent = reply.senderType === SenderType.AGENT;
						const author = replyAuthorLabel(reply, ticket);
						return (
							<li key={reply.id} className='relative flex gap-3'>
								<div
									className={
										"relative z-10 grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold tracking-wide ring-2 ring-background " +
										(isAgent
											? "bg-foreground text-background"
											: "bg-muted text-foreground")
									}>
									{author.slice(0, 2).toUpperCase()}
								</div>
								<div className='surface-panel min-w-0 flex-1 overflow-hidden text-sm'>
									<div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b hairline px-4 py-2'>
										<div className='flex items-center gap-2'>
											<span className='font-medium'>{author}</span>
											<span aria-hidden className='text-muted-foreground/40'>·</span>
											<span
												className={
													"font-mono text-[9px] tracking-widest uppercase " +
													(isAgent
														? "text-foreground"
														: "text-muted-foreground")
												}>
												{isAgent ? "Agent" : "Customer"}
											</span>
										</div>
										<time
											dateTime={reply.createdAt}
											className='font-mono text-[10px] tabular-nums text-muted-foreground'>
											{dateFormatter.format(new Date(reply.createdAt))}
										</time>
									</div>
									<div className='whitespace-pre-wrap px-4 py-3 leading-relaxed'>
										{reply.body}
									</div>
								</div>
							</li>
						);
					})}
				</ol>
			)}

			<form
				onSubmit={onSubmit}
				noValidate
				className='mt-8'>
				<div className='mb-3 flex items-center gap-3'>
					<span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
						Compose
					</span>
					<span aria-hidden className='h-px flex-1 bg-hairline' />
				</div>
				<Controller
					name='body'
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel
								htmlFor='reply-body'
								className='sr-only'>
								Add a reply
							</FieldLabel>
							<textarea
								{...field}
								id='reply-body'
								rows={10}
								placeholder='Write a reply…'
								aria-invalid={fieldState.invalid}
								disabled={mutation.isPending || polishMutation.isPending}
								className={`${TEXTAREA_CLASS} min-h-48 resize-y`}
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

				{polishErrorMessage && !polishMutation.isPending && (
					<Alert
						variant='destructive'
						className='mt-3'>
						<AlertDescription>
							Failed to polish reply: {polishErrorMessage}
						</AlertDescription>
					</Alert>
				)}

				<div className='mt-3 flex justify-end gap-2'>
					<Button
						type='button'
						variant='outline'
						onClick={onPolish}
						disabled={
							mutation.isPending || polishMutation.isPending || isReplyEmpty
						}>
						{polishMutation.isPending ? "Polishing…" : "Polish"}
					</Button>
					<Button
						type='submit'
						disabled={
							mutation.isPending ||
							polishMutation.isPending ||
							isSubmitting ||
							isReplyEmpty
						}>
						{mutation.isPending ? "Sending…" : "Send reply"}
					</Button>
				</div>
			</form>
		</section>
	);
}
