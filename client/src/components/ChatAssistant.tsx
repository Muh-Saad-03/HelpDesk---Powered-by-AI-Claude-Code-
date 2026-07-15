/** @format */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	getToolName,
	isToolUIPart,
	type UIMessage,
} from "ai";
import Markdown from "react-markdown";
import { Mic, MessageCircle, SendHorizontal, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolResultWidget } from "@/chat/WidgetRenderer";
import type { WidgetAction } from "@/chat/widgetTypes";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { VoiceSession } from "./VoiceSession";

const PENDING_LABELS: Record<string, string> = {
	search_tickets: "Searching tickets…",
	get_ticket: "Fetching ticket…",
	get_ticket_replies: "Fetching conversation…",
	get_ticket_stats: "Crunching stats…",
	reply_to_ticket: "Sending reply…",
};

// Floating assistant: one entry-point bubble bottom-right that opens a panel
// with the text chat (streamed from /api/chat) and the voice assistant (mic
// button next to Send). Mounted once in AuthenticatedLayout so chat history
// and a live voice call survive route navigation; closing the panel only
// hides it. Voice turns and voice tool results are appended into the same
// message thread — one conversation, and the text model sees the voice
// context on its next turn (synthesized parts convert to valid model
// messages server-side).
export function ChatAssistant() {
	const [open, setOpen] = useState(false);
	const [input, setInput] = useState("");
	const [transport] = useState(
		() => new DefaultChatTransport({ api: "/api/chat", credentials: "include" }),
	);
	const { messages, sendMessage, status, error, setMessages } = useChat({
		transport,
	});

	const appendVoiceMessage = useCallback(
		(role: "user" | "assistant", parts: UIMessage["parts"]) => {
			setMessages((m) => [...m, { id: crypto.randomUUID(), role, parts }]);
		},
		[setMessages],
	);
	const voice = useRealtimeVoice({
		onUserTranscript: (text) =>
			appendVoiceMessage("user", [{ type: "text", text }]),
		onAssistantTranscript: (text) =>
			appendVoiceMessage("assistant", [{ type: "text", text }]),
		onToolResult: ({ name, callId, input: toolInput, output }) =>
			appendVoiceMessage("assistant", [
				{
					type: `tool-${name}`,
					toolCallId: callId,
					state: "output-available",
					input: toolInput,
					output,
				} as UIMessage["parts"][number],
			]),
	});
	const navigate = useNavigate();
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const list = listRef.current;
		if (list) list.scrollTop = list.scrollHeight;
	}, [messages, open, voice.status]);

	function handleAction(action: WidgetAction) {
		if (action.type === "open_ticket") {
			const ticketId = action.payload?.ticketId;
			if (typeof ticketId === "string" && ticketId) {
				navigate(`/tickets/${ticketId}`);
			}
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const text = input.trim();
		if (!text || status !== "ready") return;
		void sendMessage({ text });
		setInput("");
	}

	if (!open) {
		return (
			<Button
				type='button'
				size='icon'
				aria-label='Open assistant'
				onClick={() => setOpen(true)}
				className='fixed right-5 bottom-5 z-40 size-12 rounded-full shadow-bubble-lg'>
				<MessageCircle className='size-5' />
			</Button>
		);
	}

	return (
		<div
			role='dialog'
			aria-label='Assistant panel'
			className='animate-rise fixed right-5 bottom-5 z-40 flex max-h-[70vh] w-96 max-w-[calc(100vw-2.5rem)] flex-col gap-3 rounded-2xl border bg-background p-4 shadow-bubble-lg'>
			<div className='flex items-center justify-between'>
				<div className='font-heading text-sm font-semibold'>Assistant</div>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					aria-label='Close assistant'
					onClick={() => setOpen(false)}
					className='size-8'>
					<X className='size-4' />
				</Button>
			</div>

			<div
				ref={listRef}
				className='flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto text-sm'>
				{messages.length === 0 && (
					<p className='m-auto max-w-60 text-center text-muted-foreground'>
						Ask about tickets, stats, or company policies, or draft a customer
						reply — or tap the mic to talk instead.
					</p>
				)}
				{messages.map((message) =>
					message.parts.map((part, i) => {
						const key = `${message.id}-${i}`;
						if (part.type === "text") {
							return message.role === "user" ?
									<div
										key={key}
										className='max-w-[85%] self-end rounded-xl bg-primary/10 px-3 py-1.5 whitespace-pre-wrap'>
										{part.text}
									</div>
								:	<div
										key={key}
										className='max-w-[85%] self-start rounded-xl bg-muted px-3 py-1.5 [&_a]:underline [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-4'>
										<Markdown>{part.text}</Markdown>
									</div>;
						}
						if (isToolUIPart(part)) {
							const toolName = getToolName(part);
							if (part.state === "output-available") {
								return (
									<div key={key} className='self-stretch'>
										<ToolResultWidget
											toolName={toolName}
											output={part.output}
											onAction={handleAction}
										/>
									</div>
								);
							}
							if (part.state === "output-error") {
								return (
									<Alert key={key} variant='destructive'>
										<AlertDescription>{part.errorText}</AlertDescription>
									</Alert>
								);
							}
							return (
								<div
									key={key}
									className='flex items-center gap-2 self-start text-xs text-muted-foreground'>
									<span className='size-1.5 animate-pulse rounded-full bg-current' />
									{PENDING_LABELS[toolName] ?? "Working…"}
								</div>
							);
						}
						// reasoning / step-start / other part types aren't rendered.
						return null;
					}),
				)}
				{status === "submitted" && (
					<div className='flex items-center gap-2 self-start text-xs text-muted-foreground'>
						<span className='size-1.5 animate-pulse rounded-full bg-current' />
						Thinking…
					</div>
				)}
				{status === "error" && (
					<Alert variant='destructive'>
						<AlertDescription>
							{error?.message || "Something went wrong. Please try again."}
						</AlertDescription>
					</Alert>
				)}
			</div>

			<VoiceSession {...voice} />

			<form onSubmit={handleSubmit} className='flex items-center gap-2'>
				<Input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder='Ask about tickets…'
					aria-label='Message'
					className='flex-1'
				/>
				<Button
					type='submit'
					size='icon'
					aria-label='Send message'
					disabled={status !== "ready" || !input.trim()}>
					<SendHorizontal className='size-4' />
				</Button>
				<Button
					type='button'
					variant={voice.status === "idle" ? "outline" : "secondary"}
					size='icon'
					aria-label='Voice assistant'
					onClick={() =>
						voice.status === "idle" ? void voice.connect() : voice.disconnect()
					}>
					<Mic className='size-4' />
				</Button>
			</form>
		</div>
	);
}
