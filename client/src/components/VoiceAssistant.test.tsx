import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceAssistant } from "./VoiceAssistant";
import type { TranscriptEntry, VoiceStatus } from "@/hooks/useRealtimeVoice";

const hookMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useRealtimeVoice", () => ({
	useRealtimeVoice: () => hookMock(),
}));

function hookState(overrides: {
	status: VoiceStatus;
	errorMessage?: string | null;
	muted?: boolean;
	transcript?: TranscriptEntry[];
}) {
	return {
		errorMessage: null,
		muted: false,
		transcript: [],
		connect: vi.fn(),
		disconnect: vi.fn(),
		toggleMute: vi.fn(),
		...overrides,
	};
}

describe("VoiceAssistant", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders only the mic button when idle and connects on click", async () => {
		const state = hookState({ status: "idle" });
		hookMock.mockReturnValue(state);
		render(<VoiceAssistant />);

		const button = screen.getByRole("button", { name: "Voice assistant" });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await userEvent.click(button);
		expect(state.connect).toHaveBeenCalledOnce();
	});

	it("shows the connecting state in the panel", () => {
		hookMock.mockReturnValue(hookState({ status: "connecting" }));
		render(<VoiceAssistant />);

		expect(
			screen.getByRole("dialog", { name: "Voice assistant panel" }),
		).toBeInTheDocument();
		expect(screen.getByText("Connecting…")).toBeInTheDocument();
	});

	it("shows transcript entries and wires mute/end buttons when active", async () => {
		const state = hookState({
			status: "active",
			transcript: [
				{ id: "1", role: "user", text: "How many open tickets?" },
				{ id: "2", role: "assistant", text: "You have four open tickets." },
			],
		});
		hookMock.mockReturnValue(state);
		render(<VoiceAssistant />);

		expect(screen.getByText("Listening")).toBeInTheDocument();
		expect(screen.getByText("How many open tickets?")).toBeInTheDocument();
		expect(
			screen.getByText("You have four open tickets."),
		).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /mute/i }));
		expect(state.toggleMute).toHaveBeenCalledOnce();

		await userEvent.click(
			screen.getByRole("button", { name: "End voice session" }),
		);
		expect(state.disconnect).toHaveBeenCalledOnce();
	});

	it("shows Muted and an Unmute button when muted", () => {
		hookMock.mockReturnValue(hookState({ status: "active", muted: true }));
		render(<VoiceAssistant />);

		expect(screen.getByText("Muted")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /unmute/i }),
		).toBeInTheDocument();
	});

	it("shows the error message with a retry button on error", async () => {
		const state = hookState({
			status: "error",
			errorMessage: "Microphone access was denied.",
		});
		hookMock.mockReturnValue(state);
		render(<VoiceAssistant />);

		expect(
			screen.getByText("Microphone access was denied."),
		).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /try again/i }));
		expect(state.connect).toHaveBeenCalledOnce();
	});
});
