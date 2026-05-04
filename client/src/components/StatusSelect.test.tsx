import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { TicketStatus } from "core";
import { renderWithQuery } from "../test/renderWithQuery";
import { StatusSelect } from "./StatusSelect";

vi.mock("axios", async () => {
	const actual = await vi.importActual<typeof import("axios")>("axios");
	return {
		...actual,
		default: { ...actual.default, patch: vi.fn() },
	};
});
const mockedAxios = vi.mocked(axios, true);

describe("StatusSelect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders one option per TicketStatus, preselected to currentStatus", () => {
		renderWithQuery(
			<StatusSelect ticketId='t1' currentStatus={TicketStatus.OPEN} />,
		);

		const select = screen.getByLabelText(/status/i) as HTMLSelectElement;
		expect(select.value).toBe(TicketStatus.OPEN);
		expect(screen.getByRole("option", { name: "Open" })).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "Resolved" }),
		).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "Closed" })).toBeInTheDocument();
	});

	it("PATCHes /api/tickets/:id with the chosen status on change", async () => {
		const user = userEvent.setup();
		mockedAxios.patch.mockResolvedValueOnce({ data: { ticket: {} } });
		renderWithQuery(
			<StatusSelect ticketId='t1' currentStatus={TicketStatus.OPEN} />,
		);

		await user.selectOptions(
			screen.getByLabelText(/status/i),
			TicketStatus.RESOLVED,
		);

		await waitFor(() => {
			expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
		});
		const [url, body, config] = mockedAxios.patch.mock.calls[0];
		expect(url).toBe("/api/tickets/t1");
		expect(body).toEqual({ status: TicketStatus.RESOLVED });
		expect(config).toMatchObject({ withCredentials: true });
	});

	it("shows an inline error when the PATCH fails", async () => {
		const user = userEvent.setup();
		mockedAxios.patch.mockRejectedValueOnce(new Error("boom"));
		renderWithQuery(
			<StatusSelect ticketId='t1' currentStatus={TicketStatus.OPEN} />,
		);

		await user.selectOptions(
			screen.getByLabelText(/status/i),
			TicketStatus.CLOSED,
		);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/failed to update status/i,
			);
		});
	});
});
