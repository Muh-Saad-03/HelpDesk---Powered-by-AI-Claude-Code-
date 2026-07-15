import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { useRealtimeVoice } from "./useRealtimeVoice";
import { executeVoiceTool } from "@/lib/voiceTools";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
vi.mock("@/lib/voiceTools", () => ({
	executeVoiceTool: vi.fn(async () => '{"ok":true}'),
}));

const mockedPost = vi.mocked(axios.post);

class FakeDataChannel {
	send = vi.fn();
	readyState = "open";
	onmessage: ((e: { data: string }) => void) | null = null;
	onopen: (() => void) | null = null;
}

class FakePeerConnection {
	static last: FakePeerConnection | null = null;
	connectionState = "new";
	ontrack: ((e: unknown) => void) | null = null;
	onconnectionstatechange: (() => void) | null = null;
	dc = new FakeDataChannel();
	addTrack = vi.fn();
	createDataChannel = vi.fn(() => this.dc);
	createOffer = vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" }));
	setLocalDescription = vi.fn(async () => {});
	setRemoteDescription = vi.fn(async () => {});
	close = vi.fn();
	constructor() {
		FakePeerConnection.last = this;
	}
}

class FakeAudio {
	autoplay = false;
	srcObject: unknown = null;
}

const micTrack = { stop: vi.fn(), enabled: true };
const micStream = {
	getTracks: () => [micTrack],
	getAudioTracks: () => [micTrack],
};
const getUserMedia = vi.fn();

async function connectHappy(result: {
	current: ReturnType<typeof useRealtimeVoice>;
}) {
	await act(async () => {
		await result.current.connect();
	});
	act(() => {
		FakePeerConnection.last!.dc.onopen?.();
	});
}

describe("useRealtimeVoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		micTrack.enabled = true;
		FakePeerConnection.last = null;
		vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
		vi.stubGlobal("Audio", FakeAudio);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: true, text: async () => "answer-sdp" })),
		);
		Object.defineProperty(navigator, "mediaDevices", {
			value: { getUserMedia },
			configurable: true,
		});
		getUserMedia.mockResolvedValue(micStream);
		mockedPost.mockResolvedValue({ data: { value: "ek_test" } });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reaches active after minting a session and opening the data channel", async () => {
		const { result } = renderHook(() => useRealtimeVoice());
		expect(result.current.status).toBe("idle");

		await connectHappy(result);

		expect(mockedPost).toHaveBeenCalledWith(
			"/api/voice/session",
			{},
			{ withCredentials: true },
		);
		expect(fetch).toHaveBeenCalledWith(
			"https://api.openai.com/v1/realtime/calls",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					Authorization: "Bearer ek_test",
					"Content-Type": "application/sdp",
				}),
				body: "offer-sdp",
			}),
		);
		expect(result.current.status).toBe("active");
	});

	it("reports a friendly error when microphone access is denied", async () => {
		getUserMedia.mockRejectedValueOnce(
			new DOMException("denied", "NotAllowedError"),
		);
		const { result } = renderHook(() => useRealtimeVoice());

		await act(async () => {
			await result.current.connect();
		});

		expect(result.current.status).toBe("error");
		expect(result.current.errorMessage).toMatch(/microphone access was denied/i);
	});

	it("enters the error state when minting the session fails", async () => {
		mockedPost.mockRejectedValueOnce(new Error("Request failed with status code 401"));
		const { result } = renderHook(() => useRealtimeVoice());

		await act(async () => {
			await result.current.connect();
		});

		expect(result.current.status).toBe("error");
		expect(result.current.errorMessage).toMatch(/401/);
		expect(micTrack.stop).toHaveBeenCalled();
	});

	it("executes function calls and replies over the data channel", async () => {
		const { result } = renderHook(() => useRealtimeVoice());
		await connectHappy(result);

		const dc = FakePeerConnection.last!.dc;
		dc.onmessage?.({
			data: JSON.stringify({
				type: "response.output_item.done",
				item: {
					type: "function_call",
					name: "get_ticket_stats",
					arguments: "{}",
					call_id: "call_1",
				},
			}),
		});

		await waitFor(() => expect(dc.send).toHaveBeenCalledTimes(2));
		expect(executeVoiceTool).toHaveBeenCalledWith("get_ticket_stats", "{}");
		expect(JSON.parse(dc.send.mock.calls[0]![0] as string)).toEqual({
			type: "conversation.item.create",
			item: {
				type: "function_call_output",
				call_id: "call_1",
				output: '{"ok":true}',
			},
		});
		expect(JSON.parse(dc.send.mock.calls[1]![0] as string)).toEqual({
			type: "response.create",
		});
	});

	it("appends completed transcripts for both speakers", async () => {
		const { result } = renderHook(() => useRealtimeVoice());
		await connectHappy(result);

		const dc = FakePeerConnection.last!.dc;
		act(() => {
			dc.onmessage?.({
				data: JSON.stringify({
					type: "conversation.item.input_audio_transcription.completed",
					item_id: "i1",
					transcript: "How many open tickets?",
				}),
			});
			dc.onmessage?.({
				data: JSON.stringify({
					type: "response.output_audio_transcript.done",
					item_id: "i2",
					transcript: "You have four open tickets.",
				}),
			});
		});

		await waitFor(() =>
			expect(result.current.transcript).toEqual([
				{ id: "i1", role: "user", text: "How many open tickets?" },
				{ id: "i2", role: "assistant", text: "You have four open tickets." },
			]),
		);
	});

	it("toggles the mic track on mute/unmute", async () => {
		const { result } = renderHook(() => useRealtimeVoice());
		await connectHappy(result);

		act(() => result.current.toggleMute());
		expect(result.current.muted).toBe(true);
		expect(micTrack.enabled).toBe(false);

		act(() => result.current.toggleMute());
		expect(result.current.muted).toBe(false);
		expect(micTrack.enabled).toBe(true);
	});

	it("stops the mic and closes the connection on unmount", async () => {
		const { result, unmount } = renderHook(() => useRealtimeVoice());
		await connectHappy(result);

		unmount();

		expect(micTrack.stop).toHaveBeenCalled();
		expect(FakePeerConnection.last!.close).toHaveBeenCalled();
	});
});
