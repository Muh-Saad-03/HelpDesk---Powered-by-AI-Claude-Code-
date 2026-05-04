import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { TicketCategory } from "core";
import { renderWithQuery } from "../test/renderWithQuery";
import { CategorySelect } from "./CategorySelect";

vi.mock("axios", async () => {
	const actual = await vi.importActual<typeof import("axios")>("axios");
	return {
		...actual,
		default: { ...actual.default, patch: vi.fn() },
	};
});
const mockedAxios = vi.mocked(axios, true);

describe("CategorySelect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders Uncategorized + one option per TicketCategory", () => {
		renderWithQuery(
			<CategorySelect ticketId='t1' currentCategory={null} />,
		);

		const select = screen.getByLabelText(/category/i) as HTMLSelectElement;
		expect(select.value).toBe("");
		expect(
			screen.getByRole("option", { name: "Uncategorized" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "General" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "Technical" }),
		).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "Refund" })).toBeInTheDocument();
	});

	it("preselects the currentCategory", () => {
		renderWithQuery(
			<CategorySelect
				ticketId='t1'
				currentCategory={TicketCategory.TECHNICAL_QUESTION}
			/>,
		);

		const select = screen.getByLabelText(/category/i) as HTMLSelectElement;
		expect(select.value).toBe(TicketCategory.TECHNICAL_QUESTION);
	});

	it("PATCHes /api/tickets/:id with the chosen category on change", async () => {
		const user = userEvent.setup();
		mockedAxios.patch.mockResolvedValueOnce({ data: { ticket: {} } });
		renderWithQuery(
			<CategorySelect ticketId='t1' currentCategory={null} />,
		);

		await user.selectOptions(
			screen.getByLabelText(/category/i),
			TicketCategory.REFUND_REQUEST,
		);

		await waitFor(() => {
			expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
		});
		const [url, body] = mockedAxios.patch.mock.calls[0];
		expect(url).toBe("/api/tickets/t1");
		expect(body).toEqual({ category: TicketCategory.REFUND_REQUEST });
	});

	it("PATCHes category: null when 'Uncategorized' is chosen", async () => {
		const user = userEvent.setup();
		mockedAxios.patch.mockResolvedValueOnce({ data: { ticket: {} } });
		renderWithQuery(
			<CategorySelect
				ticketId='t1'
				currentCategory={TicketCategory.GENERAL_QUESTION}
			/>,
		);

		await user.selectOptions(screen.getByLabelText(/category/i), "");

		await waitFor(() => {
			expect(mockedAxios.patch.mock.calls[0]?.[1]).toEqual({ category: null });
		});
	});

	it("shows an inline error when the PATCH fails", async () => {
		const user = userEvent.setup();
		mockedAxios.patch.mockRejectedValueOnce(new Error("boom"));
		renderWithQuery(
			<CategorySelect ticketId='t1' currentCategory={null} />,
		);

		await user.selectOptions(
			screen.getByLabelText(/category/i),
			TicketCategory.GENERAL_QUESTION,
		);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/failed to update category/i,
			);
		});
	});
});
