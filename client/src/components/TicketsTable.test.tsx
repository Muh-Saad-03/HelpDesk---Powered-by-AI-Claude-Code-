import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TicketCategory, TicketStatus } from "core";
import { TicketsTable, type Ticket } from "./TicketsTable";

const defaultSorting = [{ id: "createdAt", desc: true }];
const noopSortingChange = vi.fn();
function renderTable(tickets: Ticket[] | undefined) {
	return render(
		<TicketsTable
			tickets={tickets}
			sorting={defaultSorting}
			onSortingChange={noopSortingChange}
		/>,
	);
}

const baseTicket: Ticket = {
	id: "t1",
	subject: "Help with billing",
	status: TicketStatus.OPEN,
	category: TicketCategory.GENERAL_QUESTION,
	fromEmail: "jane@example.com",
	fromName: "Jane Doe",
	createdAt: "2026-05-04T05:15:17.000Z",
};

describe("TicketsTable", () => {
	it("renders skeleton rows when tickets is undefined", () => {
		const { container } = renderTable(undefined);

		const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
		// 5 skeleton rows × 6 skeleton elements (subject + sender top + sender
		// bottom + status + category + created) = 30.
		expect(skeletons.length).toBe(30);
		expect(screen.queryByText(baseTicket.subject)).not.toBeInTheDocument();
	});

	it("renders rows in the order they are passed (server controls sort)", () => {
		const newer: Ticket = { ...baseTicket, id: "newer", subject: "Newer one" };
		const older: Ticket = { ...baseTicket, id: "older", subject: "Older one" };

		renderTable([newer, older]);

		const subjects = screen
			.getAllByRole("row")
			.slice(1) // drop header row
			.map((r) => r.querySelector("td")?.textContent ?? "");
		expect(subjects).toEqual(["Newer one", "Older one"]);
	});

	it("shows fromName above fromEmail when a name is present", () => {
		renderTable([baseTicket]);

		const row = screen.getByText("Help with billing").closest("tr");
		expect(row).not.toBeNull();
		expect(within(row as HTMLElement).getByText("Jane Doe")).toBeInTheDocument();
		expect(
			within(row as HTMLElement).getByText("jane@example.com"),
		).toBeInTheDocument();
	});

	it("shows only the email when fromName is null", () => {
		const anon: Ticket = { ...baseTicket, fromName: null };
		renderTable([anon]);

		const row = screen.getByText("Help with billing").closest("tr");
		expect(row).not.toBeNull();
		const cell = within(row as HTMLElement).getByText("jane@example.com");
		expect(cell).toBeInTheDocument();
		// The muted secondary line is reserved for the email-when-name-present
		// case; with no name, the email should NOT carry the muted class.
		expect(cell.className).not.toContain("text-muted-foreground");
	});

	it("renders the friendly category label, or an em dash when null", () => {
		const general: Ticket = {
			...baseTicket,
			id: "g",
			subject: "General q",
			category: TicketCategory.GENERAL_QUESTION,
		};
		const technical: Ticket = {
			...baseTicket,
			id: "t",
			subject: "Tech q",
			category: TicketCategory.TECHNICAL_QUESTION,
		};
		const refund: Ticket = {
			...baseTicket,
			id: "r",
			subject: "Refund q",
			category: TicketCategory.REFUND_REQUEST,
		};
		const uncategorized: Ticket = {
			...baseTicket,
			id: "u",
			subject: "Uncategorized",
			category: null,
		};

		renderTable([general, technical, refund, uncategorized]);

		expect(
			within(screen.getByText("General q").closest("tr") as HTMLElement).getByText("General"),
		).toBeInTheDocument();
		expect(
			within(screen.getByText("Tech q").closest("tr") as HTMLElement).getByText("Technical"),
		).toBeInTheDocument();
		expect(
			within(screen.getByText("Refund q").closest("tr") as HTMLElement).getByText("Refund"),
		).toBeInTheDocument();
		expect(
			within(screen.getByText("Uncategorized").closest("tr") as HTMLElement).getByText("—"),
		).toBeInTheDocument();
	});

	it("renders the status pill with the lowercase status text", () => {
		const open: Ticket = { ...baseTicket, id: "o", subject: "Open one", status: TicketStatus.OPEN };
		const resolved: Ticket = {
			...baseTicket,
			id: "rs",
			subject: "Resolved one",
			status: TicketStatus.RESOLVED,
		};
		const closed: Ticket = {
			...baseTicket,
			id: "cl",
			subject: "Closed one",
			status: TicketStatus.CLOSED,
		};

		renderTable([open, resolved, closed]);

		expect(
			within(screen.getByText("Open one").closest("tr") as HTMLElement).getByText("open"),
		).toBeInTheDocument();
		expect(
			within(screen.getByText("Resolved one").closest("tr") as HTMLElement).getByText("resolved"),
		).toBeInTheDocument();
		expect(
			within(screen.getByText("Closed one").closest("tr") as HTMLElement).getByText("closed"),
		).toBeInTheDocument();
	});
});
