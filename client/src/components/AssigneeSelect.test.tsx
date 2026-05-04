import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { renderWithQuery } from "../test/renderWithQuery";
import { AssigneeSelect } from "./AssigneeSelect";

vi.mock("axios", async () => {
	const actual = await vi.importActual<typeof import("axios")>("axios");
	return {
		...actual,
		default: { ...actual.default, get: vi.fn(), patch: vi.fn() },
	};
});
const mockedAxios = vi.mocked(axios, true);

const users = [
	{ id: "u-1", name: "Alex Agent", email: "alex@h.io" },
	{ id: "u-2", name: "Bea Agent", email: "bea@h.io" },
];

function mockUsers(response: { data: { users: typeof users } } | Error) {
	mockedAxios.get.mockImplementation(async (url: string) => {
		if (url === "/api/users/assignable") {
			if (response instanceof Error) throw response;
			return response;
		}
		throw new Error(`Unexpected GET ${url}`);
	});
}

describe("AssigneeSelect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders Unassigned plus one option per assignable user", async () => {
		mockUsers({ data: { users } });
		renderWithQuery(<AssigneeSelect ticketId='t1' currentAssigneeId={null} />);

		await screen.findByRole("option", { name: "Alex Agent" });
		expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "Bea Agent" })).toBeInTheDocument();
	});

	it("preselects the currentAssigneeId", async () => {
		mockUsers({ data: { users } });
		renderWithQuery(<AssigneeSelect ticketId='t1' currentAssigneeId='u-2' />);

		const select = (await screen.findByLabelText(
			/assignee/i,
		)) as HTMLSelectElement;
		await waitFor(() => expect(select.value).toBe("u-2"));
	});

	it("PATCHes /api/tickets/:id with the chosen assigneeId on change", async () => {
		const user = userEvent.setup();
		mockUsers({ data: { users } });
		mockedAxios.patch.mockResolvedValueOnce({ data: { ticket: {} } });
		renderWithQuery(<AssigneeSelect ticketId='t1' currentAssigneeId={null} />);

		await screen.findByRole("option", { name: "Alex Agent" });
		await user.selectOptions(screen.getByLabelText(/assignee/i), "u-1");

		await waitFor(() => {
			expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
		});
		const [url, body, config] = mockedAxios.patch.mock.calls[0];
		expect(url).toBe("/api/tickets/t1");
		expect(body).toEqual({ assigneeId: "u-1" });
		expect(config).toMatchObject({ withCredentials: true });
	});

	it("PATCHes assigneeId: null when 'Unassigned' is chosen", async () => {
		const user = userEvent.setup();
		mockUsers({ data: { users } });
		mockedAxios.patch.mockResolvedValueOnce({ data: { ticket: {} } });
		renderWithQuery(<AssigneeSelect ticketId='t1' currentAssigneeId='u-1' />);

		await screen.findByRole("option", { name: "Alex Agent" });
		await user.selectOptions(screen.getByLabelText(/assignee/i), "");

		await waitFor(() => {
			expect(mockedAxios.patch.mock.calls[0]?.[1]).toEqual({ assigneeId: null });
		});
	});

	it("shows an inline error when the PATCH fails", async () => {
		const user = userEvent.setup();
		mockUsers({ data: { users } });
		mockedAxios.patch.mockRejectedValueOnce(new Error("boom"));
		renderWithQuery(<AssigneeSelect ticketId='t1' currentAssigneeId={null} />);

		await screen.findByRole("option", { name: "Alex Agent" });
		await user.selectOptions(screen.getByLabelText(/assignee/i), "u-1");

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/failed to update assignee/i,
			);
		});
	});
});
