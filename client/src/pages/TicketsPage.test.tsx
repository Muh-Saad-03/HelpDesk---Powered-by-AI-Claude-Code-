import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

	it("calls /api/tickets with credentials, abort signal, and default sort params", async () => {
		mockedAxios.get.mockResolvedValueOnce({ data: { tickets: [ticketA] } });

		renderPage();
		await screen.findByText("Help with billing");

		expect(mockedAxios.get).toHaveBeenCalledTimes(1);
		const [url, config] = mockedAxios.get.mock.calls[0];
		expect(url).toBe("/api/tickets");
		expect(config).toMatchObject({
			withCredentials: true,
			params: { sortBy: "createdAt", sortOrder: "desc" },
		});
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

	it("clicking the Subject header refetches with sortBy=subject, asc", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		await user.click(screen.getByRole("button", { name: /subject/i }));

		await waitFor(() => {
			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});
		const lastCall = mockedAxios.get.mock.calls.at(-1)!;
		expect(lastCall[1]).toMatchObject({
			params: { sortBy: "subject", sortOrder: "asc" },
		});
	});

	it("clicking the Subject header twice toggles to desc", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		const subjectHeader = screen.getByRole("button", { name: /subject/i });
		await user.click(subjectHeader);
		await waitFor(() =>
			expect(mockedAxios.get.mock.calls.at(-1)?.[1]).toMatchObject({
				params: { sortBy: "subject", sortOrder: "asc" },
			}),
		);

		await user.click(subjectHeader);
		await waitFor(() =>
			expect(mockedAxios.get.mock.calls.at(-1)?.[1]).toMatchObject({
				params: { sortBy: "subject", sortOrder: "desc" },
			}),
		);
	});

	it("selecting a status from the dropdown sends status=OPEN", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		await user.selectOptions(
			screen.getByLabelText(/filter by status/i),
			TicketStatus.OPEN,
		);

		await waitFor(() => {
			expect(mockedAxios.get.mock.calls.at(-1)?.[1]).toMatchObject({
				params: {
					sortBy: "createdAt",
					sortOrder: "desc",
					status: TicketStatus.OPEN,
				},
			});
		});
	});

	it("selecting 'All' clears the status filter", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		const statusSelect = screen.getByLabelText(/filter by status/i);
		await user.selectOptions(statusSelect, TicketStatus.RESOLVED);
		await user.selectOptions(statusSelect, "");

		await waitFor(() => {
			const params = mockedAxios.get.mock.calls.at(-1)?.[1]?.params ?? {};
			expect(params).not.toHaveProperty("status");
		});
	});

	it("category dropdown sends category=GENERAL_QUESTION", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		await user.selectOptions(
			screen.getByLabelText(/filter by category/i),
			TicketCategory.GENERAL_QUESTION,
		);

		await waitFor(() => {
			expect(mockedAxios.get.mock.calls.at(-1)?.[1]).toMatchObject({
				params: { category: TicketCategory.GENERAL_QUESTION },
			});
		});
	});

	it("typing in the search box debounces and sends q=…", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		await user.type(screen.getByLabelText(/search tickets/i), "billing");

		// Debounce is 300ms; waitFor's default 1000ms is plenty.
		await waitFor(() => {
			expect(mockedAxios.get.mock.calls.at(-1)?.[1]).toMatchObject({
				params: { q: "billing" },
			});
		});
	});

	it("Clear filters button resets status, category, and search", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		await user.selectOptions(
			screen.getByLabelText(/filter by status/i),
			TicketStatus.OPEN,
		);
		await user.selectOptions(
			screen.getByLabelText(/filter by category/i),
			TicketCategory.GENERAL_QUESTION,
		);
		await user.type(screen.getByLabelText(/search tickets/i), "billing");

		await user.click(screen.getByRole("button", { name: /clear filters/i }));

		await waitFor(() => {
			const params = mockedAxios.get.mock.calls.at(-1)?.[1]?.params ?? {};
			expect(params).not.toHaveProperty("status");
			expect(params).not.toHaveProperty("category");
			expect(params).not.toHaveProperty("q");
		});
	});

	it("clicking the same header a third time stays sorted (never off)", async () => {
		const user = userEvent.setup();
		mockedAxios.get.mockResolvedValue({ data: { tickets: [ticketA] } });
		renderPage();
		await screen.findByText("Help with billing");

		const subjectHeader = screen.getByRole("button", { name: /subject/i });
		await user.click(subjectHeader); // asc
		await user.click(subjectHeader); // desc
		await user.click(subjectHeader); // would go to "off" — guarded back to asc

		await waitFor(() => {
			const params = mockedAxios.get.mock.calls.at(-1)?.[1]?.params;
			expect(params).toMatchObject({ sortBy: "subject" });
			expect(params.sortOrder).toMatch(/^(asc|desc)$/);
		});
		// Specifically: third click flips back to asc.
		expect(mockedAxios.get.mock.calls.at(-1)?.[1]).toMatchObject({
			params: { sortBy: "subject", sortOrder: "asc" },
		});
	});
});
