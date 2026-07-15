/** @format */

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { executeVoiceTool } from "@/lib/voiceTools";

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export type VoiceStatus = "idle" | "connecting" | "active" | "error";

export type TranscriptEntry = {
	id: string;
	role: "user" | "assistant";
	text: string;
};

// Owns the whole lifecycle of a Realtime voice call: mint an ephemeral
// secret from our server, open a WebRTC peer connection straight to OpenAI
// (mic track up, remote audio down, "oai-events" data channel for JSON
// events), execute function calls against our own API, and tear everything
// down on hangup/unmount.
export function useRealtimeVoice() {
	const [status, setStatus] = useState<VoiceStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [muted, setMuted] = useState(false);
	const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

	const pcRef = useRef<RTCPeerConnection | null>(null);
	const micStreamRef = useRef<MediaStream | null>(null);
	const audioElRef = useRef<HTMLAudioElement | null>(null);

	const teardown = useCallback(() => {
		micStreamRef.current?.getTracks().forEach((t) => t.stop());
		micStreamRef.current = null;
		if (pcRef.current) {
			pcRef.current.onconnectionstatechange = null;
			pcRef.current.close();
			pcRef.current = null;
		}
		if (audioElRef.current) {
			audioElRef.current.srcObject = null;
			audioElRef.current = null;
		}
		setMuted(false);
	}, []);

	const disconnect = useCallback(() => {
		teardown();
		setTranscript([]);
		setErrorMessage(null);
		setStatus("idle");
	}, [teardown]);

	// Stop the mic and close the connection when the widget unmounts.
	useEffect(() => teardown, [teardown]);

	const handleServerEvent = useCallback(
		async (dc: RTCDataChannel, raw: string) => {
			const event = JSON.parse(raw);
			switch (event.type) {
				case "response.output_item.done": {
					const item = event.item;
					if (item?.type !== "function_call") break;
					const output = await executeVoiceTool(item.name, item.arguments);
					if (dc.readyState !== "open") break;
					dc.send(
						JSON.stringify({
							type: "conversation.item.create",
							item: {
								type: "function_call_output",
								call_id: item.call_id,
								output,
							},
						}),
					);
					dc.send(JSON.stringify({ type: "response.create" }));
					break;
				}
				case "conversation.item.input_audio_transcription.completed": {
					if (!event.transcript) break;
					const entry: TranscriptEntry = {
						id: event.item_id ?? crypto.randomUUID(),
						role: "user",
						text: event.transcript,
					};
					setTranscript((t) => [...t, entry]);
					break;
				}
				case "response.output_audio_transcript.done": {
					if (!event.transcript) break;
					const entry: TranscriptEntry = {
						id: event.item_id ?? crypto.randomUUID(),
						role: "assistant",
						text: event.transcript,
					};
					setTranscript((t) => [...t, entry]);
					break;
				}
			}
		},
		[],
	);

	const connect = useCallback(async () => {
		if (pcRef.current) return;
		setErrorMessage(null);

		if (
			!navigator.mediaDevices?.getUserMedia ||
			typeof RTCPeerConnection === "undefined"
		) {
			setErrorMessage("Voice is not supported in this browser.");
			setStatus("error");
			return;
		}

		setStatus("connecting");
		setTranscript([]);
		try {
			const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
			micStreamRef.current = mic;

			// Mint the ephemeral Realtime secret with the user's session cookie.
			const { data: session } = await axios.post<{ value: string }>(
				"/api/voice/session",
				{},
				{ withCredentials: true },
			);

			const pc = new RTCPeerConnection();
			pcRef.current = pc;
			for (const track of mic.getTracks()) pc.addTrack(track, mic);

			pc.ontrack = (e) => {
				const el = new Audio();
				el.autoplay = true;
				el.srcObject = e.streams[0];
				audioElRef.current = el;
			};
			pc.onconnectionstatechange = () => {
				if (
					pc.connectionState === "failed" ||
					pc.connectionState === "disconnected"
				) {
					teardown();
					setErrorMessage("Connection lost.");
					setStatus("error");
				}
			};

			const dc = pc.createDataChannel("oai-events");
			dc.onmessage = (e) => void handleServerEvent(dc, e.data);
			dc.onopen = () => setStatus("active");

			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			const sdpRes = await fetch(REALTIME_CALLS_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${session.value}`,
					"Content-Type": "application/sdp",
				},
				body: offer.sdp,
			});
			if (!sdpRes.ok) {
				throw new Error(`Voice handshake failed (${sdpRes.status})`);
			}
			await pc.setRemoteDescription({
				type: "answer",
				sdp: await sdpRes.text(),
			});
		} catch (err) {
			teardown();
			const isDenied =
				err instanceof DOMException &&
				(err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
			setErrorMessage(
				isDenied ?
					"Microphone access was denied. Allow it in your browser settings and try again."
				: err instanceof Error ? err.message
				: "Failed to start the voice session.",
			);
			setStatus("error");
		}
	}, [handleServerEvent, teardown]);

	const toggleMute = useCallback(() => {
		const stream = micStreamRef.current;
		if (!stream) return;
		setMuted((prev) => {
			stream.getAudioTracks().forEach((t) => {
				t.enabled = prev;
			});
			return !prev;
		});
	}, []);

	return {
		status,
		errorMessage,
		muted,
		transcript,
		connect,
		disconnect,
		toggleMute,
	};
}
