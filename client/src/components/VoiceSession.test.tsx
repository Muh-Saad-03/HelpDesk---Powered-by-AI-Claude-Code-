import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceSession, type VoiceSessionProps } from "./VoiceSession";
import type { VoiceStatus } from "@/hooks/useRealtimeVoice";

function makeProps(overrides: {
	status: VoiceStatus;
	errorMessage?: string | null;
	muted?: boolean;
}): VoiceSessionProps {
	return {
		errorMessage: null,
		muted: false,
		connect: vi.fn(),
		disconnect: vi.fn(),
		toggleMute: vi.fn(),
		...overrides,
	} as VoiceSessionProps;
}

describe("VoiceSession", () => {
	it("renders nothing when idle", () => {
		render(<VoiceSession {...makeProps({ status: "idle" })} />);
		expect(
			screen.queryByRole("region", { name: "Voice session" }),
		).not.toBeInTheDocument();
	});

	it("shows the connecting state", () => {
		render(<VoiceSession {...makeProps({ status: "connecting" })} />);

		expect(
			screen.getByRole("region", { name: "Voice session" }),
		).toBeInTheDocument();
		expect(screen.getByText("Connecting…")).toBeInTheDocument();
	});

	it("shows Listening and wires mute/end buttons when active", async () => {
		const props = makeProps({ status: "active" });
		render(<VoiceSession {...props} />);

		expect(screen.getByText("Listening")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Mute" }));
		expect(props.toggleMute).toHaveBeenCalledOnce();

		await userEvent.click(
			screen.getByRole("button", { name: "End voice session" }),
		);
		expect(props.disconnect).toHaveBeenCalledOnce();
	});

	it("shows Muted and an Unmute button when muted", () => {
		render(<VoiceSession {...makeProps({ status: "active", muted: true })} />);

		expect(screen.getByText("Muted")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
	});

	it("shows the error message with retry and dismiss on error", async () => {
		const props = makeProps({
			status: "error",
			errorMessage: "Microphone access was denied.",
		});
		render(<VoiceSession {...props} />);

		expect(
			screen.getByText("Microphone access was denied."),
		).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /try again/i }));
		expect(props.connect).toHaveBeenCalledOnce();

		await userEvent.click(
			screen.getByRole("button", { name: "End voice session" }),
		);
		expect(props.disconnect).toHaveBeenCalledOnce();
	});
});
