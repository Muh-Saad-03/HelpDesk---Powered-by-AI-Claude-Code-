import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Role, TicketCategory, TicketStatus } from "core";
import axios from "axios";
import { renderWithQuery } from "../test/renderWithQuery";
import { TicketsPage } from "./TicketsPage";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

vi.mock("@/lib/auth-client", () => ({
	authClient: { signOut: vi.fn() },
	useSession: () => ({
		data: {
			user: {
				id: "u-admin",
				name: "Test Admin",
				email: "admin@test.local",
				role: Role.ADMIN,
			},
		},
		isPending: false,
	}),
	signIn: vi.fn(),
	signOut: vi.fn(),
}));

function renderPage() {
	return renderWithQuery(
		<MemoryRouter>
			<TicketsPage />
		</MemoryRouter>,
	);
}

const ticketA = {
	id: "ta",
	subject: "Help with billing",
	status: TicketStatus.OPEN,
	category: TicketCategory.GENERAL_QUESTION,
	fromEmail: "jane@example.com",
	fromName: "Jane Doe",
	createdAt: "2026-05-04T05:15:17.000Z",
};
const ticketB = {
	id: "tb",
	subject: "Login broken",
	status: TicketStatus.OPEN,
	category: null,
	fromEmail: "sam@example.com",
	fromName: null,
	createdAt: "2026-05-04T05:21:29.000Z",
};

describe("TicketsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the Tickets heading", () => {
		mockedAxios.get.mockReturnValue(new Promise(() => {}));
		renderPage();
		expect(
			screen.getByRole("heading", { name: "Tickets", level: 1 }),
		).toBeInTheDocument();
	});

	it("shows skeleton rows while the request is in flight", () => {
		mockedAxios.get.mockReturnValue(new Promise(() => {}));
		const { container } = renderPage();

		const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
		// 5 skeleton rows × 6 skeleton elements per row = 30.
		expect(skeletons.length).toBe(30);
		expect(screen.queryByText(ticketA.subject)).not.toBeInTheDocument();
	});

	it("renders one row per ticket once the data resolves", async () => {
		mockedAxios.get.mockResolvedValueOnce({
			data: { tickets: [ticketB, ticketA] },
		});

		renderPage();

		expect(await screen.findByText("Login broken")).toBeInTheDocument();
		expect(screen.getByText("Help with billing")).toBeInTheDocument();
		expect(screen.getByText("Jane Doe")).toBeInTheDocument();
		expect(screen.getByText("sam@example.com")).toBeInTheDocument();
	});

	it("calls /api/tickets with credentials and an abort signal", async () => {
		mockedAxios.get.mockResolvedValueOnce({ data: { tickets: [ticketA] } });

		renderPage();
		await screen.findByText("Help with billing");

		expect(mockedAxios.get).toHaveBeenCalledTimes(1);
		const [url, config] = mockedAxios.get.mock.calls[0];
		expect(url).toBe("/api/tickets");
		expect(config).toMatchObject({ withCredentials: true });
		expect(config?.signal).toBeInstanceOf(AbortSignal);
	});

	it("shows the empty state when the server returns no tickets", async () => {
		mockedAxios.get.mockResolvedValueOnce({ data: { tickets: [] } });
		renderPage();

		expect(await screen.findByText("No tickets yet.")).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("shows an error alert when the request fails", async () => {
		mockedAxios.get.mockRejectedValueOnce(new Error("Network down"));
		renderPage();

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert")).toHaveTextContent(
			/failed to load tickets: network down/i,
		);
	});
});
