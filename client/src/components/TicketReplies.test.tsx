import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { SenderType } from "core";
import { renderWithQuery } from "../test/renderWithQuery";
import { TicketReplies } from "./TicketReplies";

const ticket = {
	id: "t1",
	fromName: "Jane Doe",
	fromEmail: "jane@example.com",
};

vi.mock("axios", async () => {
	const actual = await vi.importActual<typeof import("axios")>("axios");
	return {
		...actual,
		default: { ...actual.default, get: vi.fn(), post: vi.fn() },
	};
});
const mockedAxios = vi.mocked(axios, true);

const replies = [
	{
		id: "r1",
		body: "Have you tried clearing the cache?",
		createdAt: "2026-05-04T10:00:00.000Z",
		senderType: SenderType.AGENT,
		authorId: "u-admin",
		author: { id: "u-admin", name: "Test Admin", email: "admin@test.local" },
	},
	{
		id: "r2",
		body: "Yes, still broken.",
		createdAt: "2026-05-04T11:00:00.000Z",
		senderType: SenderType.CUSTOMER,
		authorId: null,
		author: null,
	},
];

function mockReplies(response: { data: { replies: typeof replies } } | Error) {
	mockedAxios.get.mockImplementation(async (url: string) => {
		if (url === "/api/tickets/t1/replies") {
			if (response instanceof Error) throw response;
			return response;
		}
		throw new Error(`Unexpected GET ${url}`);
	});
}

describe("TicketReplies", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders each reply with author name and body", async () => {
		mockReplies({ data: { replies } });
		renderWithQuery(<TicketReplies ticket={ticket} />);

		await screen.findByText(/clearing the cache/i);
		expect(screen.getByText("Test Admin")).toBeInTheDocument();
		expect(screen.getByText(/yes, still broken/i)).toBeInTheDocument();
	});

	it("labels agent replies as Agent and customer replies with the ticket sender name", async () => {
		mockReplies({ data: { replies } });
		renderWithQuery(<TicketReplies ticket={ticket} />);

		await screen.findByText(/clearing the cache/i);
		// Agent reply: badge says "Agent" and the author name comes from the user.
		expect(screen.getByText("Agent")).toBeInTheDocument();
		expect(screen.getByText("Test Admin")).toBeInTheDocument();
		// Customer reply: badge says "Customer" and the name falls back to the
		// ticket's sender (fromName).
		expect(screen.getByText("Customer")).toBeInTheDocument();
		expect(screen.getByText("Jane Doe")).toBeInTheDocument();
	});

	it("falls back to fromEmail when the customer ticket has no fromName", async () => {
		mockReplies({ data: { replies: [replies[1]] } });
		renderWithQuery(
			<TicketReplies
				ticket={{ id: "t1", fromName: null, fromEmail: "anon@example.com" }}
			/>,
		);

		await screen.findByText(/yes, still broken/i);
		expect(screen.getByText("anon@example.com")).toBeInTheDocument();
	});

	it("shows 'No replies yet.' when the thread is empty", async () => {
		mockReplies({ data: { replies: [] } });
		renderWithQuery(<TicketReplies ticket={ticket} />);

		expect(await screen.findByText(/no replies yet/i)).toBeInTheDocument();
	});

	it("shows an error alert when loading replies fails", async () => {
		mockReplies(new Error("Network down"));
		renderWithQuery(<TicketReplies ticket={ticket} />);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/failed to load replies: network down/i,
			);
		});
	});

	it("POSTs the reply body and clears the textarea on success", async () => {
		const user = userEvent.setup();
		mockReplies({ data: { replies: [] } });
		mockedAxios.post.mockResolvedValueOnce({ data: { reply: replies[0] } });

		renderWithQuery(<TicketReplies ticket={ticket} />);
		await screen.findByText(/no replies yet/i);

		const textarea = screen.getByLabelText(/add a reply/i) as HTMLTextAreaElement;
		await user.type(textarea, "Looking into it now.");
		await user.click(screen.getByRole("button", { name: /send reply/i }));

		await waitFor(() => {
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
		});
		const [url, body, config] = mockedAxios.post.mock.calls[0];
		expect(url).toBe("/api/tickets/t1/replies");
		expect(body).toEqual({ body: "Looking into it now." });
		expect(config).toMatchObject({ withCredentials: true });

		await waitFor(() => expect(textarea.value).toBe(""));
	});

	it("blocks empty submissions client-side", async () => {
		const user = userEvent.setup();
		mockReplies({ data: { replies: [] } });

		renderWithQuery(<TicketReplies ticket={ticket} />);
		await screen.findByText(/no replies yet/i);

		await user.click(screen.getByRole("button", { name: /send reply/i }));

		await screen.findByText(/reply cannot be empty/i);
		expect(mockedAxios.post).not.toHaveBeenCalled();
	});

	it("surfaces the server error message when the POST fails", async () => {
		const user = userEvent.setup();
		mockReplies({ data: { replies: [] } });
		const headers = new AxiosHeaders();
		mockedAxios.post.mockRejectedValueOnce(
			new AxiosError(
				"Request failed with status code 400",
				"ERR_BAD_REQUEST",
				{ headers, url: "/api/tickets/t1/replies" } as never,
				undefined,
				{
					status: 400,
					statusText: "Bad Request",
					headers,
					config: { headers } as never,
					data: { error: "Reply is too long" },
				},
			),
		);

		renderWithQuery(<TicketReplies ticket={ticket} />);
		await screen.findByText(/no replies yet/i);

		await user.type(screen.getByLabelText(/add a reply/i), "hello");
		await user.click(screen.getByRole("button", { name: /send reply/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(/reply is too long/i);
		});
	});
});
