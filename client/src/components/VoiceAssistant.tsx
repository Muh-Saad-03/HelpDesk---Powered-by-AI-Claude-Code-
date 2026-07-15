/** @format */

import { Mic, MicOff, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";

export function VoiceAssistant() {
	const {
		status,
		errorMessage,
		muted,
		transcript,
		connect,
		disconnect,
		toggleMute,
	} = useRealtimeVoice();

	if (status === "idle") {
		return (
			<Button
				type='button'
				size='icon'
				aria-label='Voice assistant'
				onClick={() => void connect()}
				className='fixed right-5 bottom-5 z-40 size-12 rounded-full shadow-lg'>
				<Mic className='size-5' />
			</Button>
		);
	}

	return (
		<div
			role='dialog'
			aria-label='Voice assistant panel'
			className='fixed right-5 bottom-5 z-40 flex w-80 flex-col gap-3 rounded-2xl border bg-background p-4 shadow-xl'>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-2 text-sm font-medium'>
					{status === "connecting" && (
						<>
							<span className='size-2 animate-pulse rounded-full bg-amber-500' />
							Connecting…
						</>
					)}
					{status === "active" && (
						<>
							<span className='size-2 animate-pulse rounded-full bg-emerald-500' />
							{muted ? "Muted" : "Listening"}
						</>
					)}
					{status === "error" && (
						<>
							<span className='size-2 rounded-full bg-destructive' />
							Voice assistant
						</>
					)}
				</div>
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

			{status === "error" && errorMessage && (
				<Alert variant='destructive'>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}

			{transcript.length > 0 && (
				<ul
					aria-label='Transcript'
					className='flex max-h-56 flex-col gap-2 overflow-y-auto text-sm'>
					{transcript.map((entry) => (
						<li
							key={entry.id}
							className={
								entry.role === "user" ?
									"self-end rounded-xl bg-primary/10 px-3 py-1.5"
								:	"self-start rounded-xl bg-muted px-3 py-1.5"
							}>
							{entry.text}
						</li>
					))}
				</ul>
			)}

			<div className='flex justify-center gap-2'>
				{status === "active" && (
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={toggleMute}>
						{muted ?
							<>
								<MicOff className='size-4' /> Unmute
							</>
						:	<>
								<Mic className='size-4' /> Mute
							</>
						}
					</Button>
				)}
				{status === "error" && (
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={() => void connect()}>
						<Mic className='size-4' /> Try again
					</Button>
				)}
			</div>
		</div>
	);
}
