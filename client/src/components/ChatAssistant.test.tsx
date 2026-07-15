import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { UIMessage } from "ai";
import { ChatAssistant } from "./ChatAssistant";

const chatMock = vi.hoisted(() => vi.fn());
const voiceMock = vi.hoisted(() => vi.fn());
const voiceCallbacks = vi.hoisted(
	() => ({ current: undefined as unknown }),
);

vi.mock("@ai-sdk/react", () => ({
	useChat: () => chatMock(),
}));

vi.mock("@/hooks/useRealtimeVoice", () => ({
	useRealtimeVoice: (callbacks: unknown) => {
		voiceCallbacks.current = callbacks;
		return voiceMock();
	},
}));

function chatState(overrides: {
	messages?: UIMessage[];
	status?: "ready" | "submitted" | "streaming" | "error";
	error?: Error;
}) {
	return {
		messages: [],
		sendMessage: vi.fn(),
		setMessages: vi.fn(),
		status: "ready" as const,
		error: undefined,
		...overrides,
	};
}

function voiceState(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		status: "idle",
		errorMessage: null,
		muted: false,
		connect: vi.fn(),
		disconnect: vi.fn(),
		toggleMute: vi.fn(),
		...overrides,
	};
}

function renderAssistant() {
	return render(
		<MemoryRouter>
			<ChatAssistant />
		</MemoryRouter>,
	);
}

async function openPanel() {
	await userEvent.click(screen.getByRole("button", { name: "Open assistant" }));
}

describe("ChatAssistant", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		chatMock.mockReturnValue(chatState({}));
		voiceMock.mockReturnValue(voiceState());
	});

	it("renders only the floating button until opened, then shows the panel", async () => {
		renderAssistant();

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		await openPanel();

		expect(
			screen.getByRole("dialog", { name: "Assistant panel" }),
		).toBeInTheDocument();
		expect(screen.getByText(/ask about tickets/i)).toBeInTheDocument();
	});

	it("sends the typed message and clears the input", async () => {
		const state = chatState({});
		chatMock.mockReturnValue(state);
		renderAssistant();
		await openPanel();

		const input = screen.getByRole("textbox", { name: "Message" });
		await userEvent.type(input, "how many open tickets?");
		await userEvent.click(screen.getByRole("button", { name: "Send message" }));

		expect(state.sendMessage).toHaveBeenCalledWith({
			text: "how many open tickets?",
		});
		expect(input).toHaveValue("");
	});

	it("disables Send while a response is streaming", async () => {
		chatMock.mockReturnValue(chatState({ status: "streaming" }));
		renderAssistant();
		await openPanel();

		await userEvent.type(
			screen.getByRole("textbox", { name: "Message" }),
			"hello",
		);
		expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
	});

	it("renders user and assistant text bubbles", async () => {
		chatMock.mockReturnValue(
			chatState({
				messages: [
					{
						id: "m1",
						role: "user",
						parts: [{ type: "text", text: "show refund tickets" }],
					},
					{
						id: "m2",
						role: "assistant",
						parts: [{ type: "text", text: "Here are the refund tickets." }],
					},
				] as UIMessage[],
			}),
		);
		renderAssistant();
		await openPanel();

		expect(screen.getByText("show refund tickets")).toBeInTheDocument();
		expect(
			screen.getByText("Here are the refund tickets."),
		).toBeInTheDocument();
	});

	it("renders a widget for a completed tool call", async () => {
		chatMock.mockReturnValue(
			chatState({
				messages: [
					{
						id: "m1",
						role: "assistant",
						parts: [
							{
								type: "tool-search_tickets",
								toolCallId: "c1",
								state: "output-available",
								input: {},
								output: {
									tickets: [
										{
											id: "t_1",
											subject: "Broken login",
											status: "OPEN",
											fromName: "Jane",
											fromEmail: "jane@example.com",
											createdAt: "2026-07-01T10:00:00.000Z",
										},
									],
									total: 1,
									page: 1,
									pageSize: 10,
								},
							},
						],
					},
				] as UIMessage[],
			}),
		);
		renderAssistant();
		await openPanel();

		expect(screen.getByText("Tickets")).toBeInTheDocument();
		expect(screen.getByText("Broken login")).toBeInTheDocument();
	});

	it("shows a pending label while a tool call is running", async () => {
		chatMock.mockReturnValue(
			chatState({
				messages: [
					{
						id: "m1",
						role: "assistant",
						parts: [
							{
								type: "tool-search_tickets",
								toolCallId: "c1",
								state: "input-available",
								input: {},
							},
						],
					},
				] as UIMessage[],
			}),
		);
		renderAssistant();
		await openPanel();

		expect(screen.getByText("Searching tickets…")).toBeInTheDocument();
	});

	it("shows an alert when the chat errors", async () => {
		chatMock.mockReturnValue(
			chatState({ status: "error", error: new Error("Request failed") }),
		);
		renderAssistant();
		await openPanel();

		expect(screen.getByText("Request failed")).toBeInTheDocument();
	});

	it("starts a voice session from the mic button", async () => {
		const voice = voiceState();
		voiceMock.mockReturnValue(voice);
		renderAssistant();
		await openPanel();

		await userEvent.click(
			screen.getByRole("button", { name: "Voice assistant" }),
		);
		expect(voice.connect).toHaveBeenCalledOnce();
	});

	it("renders the voice status strip inside the panel when active", async () => {
		voiceMock.mockReturnValue(voiceState({ status: "active" }));
		renderAssistant();
		await openPanel();

		expect(
			screen.getByRole("region", { name: "Voice session" }),
		).toBeInTheDocument();
		expect(screen.getByText("Listening")).toBeInTheDocument();
	});

	it("appends voice transcripts and tool results into the chat thread", async () => {
		const state = chatState({});
		chatMock.mockReturnValue(state);
		renderAssistant();
		await openPanel();

		type Callbacks = {
			onUserTranscript: (text: string) => void;
			onAssistantTranscript: (text: string) => void;
			onToolResult: (r: {
				name: string;
				callId: string;
				input: unknown;
				output: unknown;
			}) => void;
		};
		const callbacks = voiceCallbacks.current as Callbacks;

		callbacks.onUserTranscript("how many open tickets?");
		callbacks.onToolResult({
			name: "search_tickets",
			callId: "call_1",
			input: {},
			output: { tickets: [], total: 0, page: 1, pageSize: 10 },
		});

		// Each append passes an updater to setMessages; apply them to an empty
		// thread and check the synthesized messages.
		expect(state.setMessages).toHaveBeenCalledTimes(2);
		const applyCall = (n: number) =>
			(
				state.setMessages.mock.calls[n]![0] as (
					m: UIMessage[],
				) => UIMessage[]
			)([]);

		const [voiceText] = applyCall(0);
		expect(voiceText.role).toBe("user");
		expect(voiceText.parts).toEqual([
			{ type: "text", text: "how many open tickets?" },
		]);

		const [toolMessage] = applyCall(1);
		expect(toolMessage.role).toBe("assistant");
		expect(toolMessage.parts).toEqual([
			{
				type: "tool-search_tickets",
				toolCallId: "call_1",
				state: "output-available",
				input: {},
				output: { tickets: [], total: 0, page: 1, pageSize: 10 },
			},
		]);
	});
});
