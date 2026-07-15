/** @format */

import { Mic, MicOff, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { useRealtimeVoice } from "@/hooks/useRealtimeVoice";

export type VoiceSessionProps = ReturnType<typeof useRealtimeVoice>;

// Slim voice status strip inside the chat assistant panel. The conversation
// itself (voice transcripts + tool widgets) flows into the shared chat
// thread — this only shows call state and controls while a session is live.
export function VoiceSession({
	status,
	errorMessage,
	muted,
	connect,
	disconnect,
	toggleMute,
}: VoiceSessionProps) {
	if (status === "idle") return null;

	if (status === "error") {
		return (
			<div
				role='region'
				aria-label='Voice session'
				className='flex flex-col gap-2 rounded-xl border bg-muted/30 p-2'>
				{errorMessage && (
					<Alert variant='destructive'>
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				)}
				<div className='flex justify-center gap-2'>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={() => void connect()}>
						<Mic className='size-4' /> Try again
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						aria-label='End voice session'
						onClick={disconnect}>
						<X className='size-4' /> Dismiss
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			role='region'
			aria-label='Voice session'
			className='flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-1.5'>
			<div className='flex items-center gap-2 text-sm font-medium'>
				{status === "connecting" ?
					<>
						<span className='size-2 animate-pulse rounded-full bg-amber-500' />
						Connecting…
					</>
				:	<>
						<span className='size-2 animate-pulse rounded-full bg-emerald-500' />
						{muted ? "Muted" : "Listening"}
					</>
				}
			</div>
			<span className='flex-1' />
			{status === "active" && (
				<Button
					type='button'
					variant='ghost'
					size='icon'
					aria-label={muted ? "Unmute" : "Mute"}
					onClick={toggleMute}
					className='size-8'>
					{muted ?
						<MicOff className='size-4' />
					:	<Mic className='size-4' />}
				</Button>
			)}
			<Button
				type='button'
				variant='ghost'
				size='icon'
				aria-label='End voice session'
				onClick={disconnect}
				className='size-8'>
				<X className='size-4' />
			</Button>
		</div>
	);
}
