import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Role, TicketCategory, TicketStatus } from "core";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { renderWithQuery } from "../test/renderWithQuery";
import { TicketDetailPage } from "./TicketDetailPage";

vi.mock("axios", async () => {
	const actual = await vi.importActual<typeof import("axios")>("axios");
	return {
		...actual,
		default: { ...actual.default, get: vi.fn(), patch: vi.fn() },
	};
});
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

const ticket = {
	id: "ta",
	subject: "Help with billing",
	body: "I was charged twice for my subscription this month.",
	status: TicketStatus.OPEN,
	category: TicketCategory.GENERAL_QUESTION,
	fromEmail: "jane@example.com",
	fromName: "Jane Doe",
	assigneeId: null,
	assignee: null,
	createdAt: "2026-05-04T05:15:17.000Z",
	updatedAt: "2026-05-04T05:15:17.000Z",
};

const assignableUsers = [
	{ id: "u-1", name: "Alex Agent", email: "alex@h.io" },
	{ id: "u-admin", name: "Test Admin", email: "admin@test.local" },
];

// Stub axios.get so any call to /api/users/assignable resolves with the
// shared `assignableUsers` list — every test here renders the detail page,
// which now mounts <AssigneeSelect> and triggers that GET. Per-test setup
// only needs to specify the ticket fetch outcome.
function mockGetByUrl(
	ticketResponse:
		| { data: { ticket: typeof ticket } }
		| { error: unknown },
) {
	mockedAxios.get.mockImplementation(async (url: string) => {
		if (url === "/api/users/assignable") {
			return { data: { users: assignableUsers } };
		}
		if (url.startsWith("/api/tickets/")) {
			if ("error" in ticketResponse) throw ticketResponse.error;
			return ticketResponse;
		}
		throw new Error(`Unexpected GET ${url}`);
	});
}

function renderPage(id = "ta") {
	return renderWithQuery(
		<MemoryRouter initialEntries={[`/tickets/${id}`]}>
			<Routes>
				<Route path='/tickets/:id' element={<TicketDetailPage />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("TicketDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the back-to-tickets link", () => {
		mockedAxios.get.mockReturnValue(new Promise(() => {}));
		renderPage();

		const back = screen.getByRole("link", { name: /back to tickets/i });
		expect(back).toHaveAttribute("href", "/tickets");
	});

	it("fetches /api/tickets/:id with the route id", async () => {
		mockGetByUrl({ data: { ticket } });
		renderPage("ta");

		await screen.findByRole("heading", { name: ticket.subject });

		const ticketCall = mockedAxios.get.mock.calls.find(
			([url]) => url === "/api/tickets/ta",
		);
		expect(ticketCall).toBeDefined();
		expect(ticketCall?.[1]).toMatchObject({ withCredentials: true });
		expect(ticketCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it("renders the ticket subject, body, sender, and status", async () => {
		mockGetByUrl({ data: { ticket } });
		renderPage();

		expect(
			await screen.findByRole("heading", { name: "Help with billing" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/charged twice for my subscription/i),
		).toBeInTheDocument();
		// Jane Doe appears in both the "From" meta row and the message box header.
		expect(screen.getAllByText("Jane Doe").length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText(/<jane@example.com>/)).toBeInTheDocument();
		expect(screen.getByText("open")).toBeInTheDocument();
		expect(screen.getByText("General")).toBeInTheDocument();
		// "Unassigned" is now the default option label in the assignee select.
		expect(
			screen.getByRole("option", { name: "Unassigned" }),
		).toBeInTheDocument();
	});

	it("preselects the current assignee in the dropdown", async () => {
		mockGetByUrl({
			data: {
				ticket: {
					...ticket,
					assigneeId: "u-1",
					assignee: { id: "u-1", name: "Alex Agent", email: "alex@h.io" },
				},
			},
		});
		renderPage();

		const select = (await screen.findByLabelText(
			/assignee/i,
		)) as HTMLSelectElement;
		await waitFor(() => expect(select.value).toBe("u-1"));
		expect(
			screen.getByRole("option", { name: "Alex Agent" }),
		).toBeInTheDocument();
	});

	it("shows a 'Ticket not found' alert on a 404", async () => {
		const headers = new AxiosHeaders();
		const notFound = new AxiosError(
			"Request failed with status code 404",
			"ERR_BAD_REQUEST",
			{ headers, url: "/api/tickets/missing" } as never,
			undefined,
			{
				status: 404,
				statusText: "Not Found",
				headers,
				config: { headers } as never,
				data: { error: "Ticket not found" },
			},
		);
		mockGetByUrl({ error: notFound });
		renderPage("missing");

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(/ticket not found/i);
		});
	});

	it("shows a generic error alert when the request fails for a non-404 reason", async () => {
		mockGetByUrl({ error: new Error("Network down") });
		renderPage();

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/failed to load ticket: network down/i,
			);
		});
	});
});
