/** @format */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { renderWithQuery } from "../test/renderWithQuery";
import { ConfirmDeleteUserDialog } from "./ConfirmDeleteUserDialog";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const target = {
	id: "u-target",
	name: "Target User",
	email: "target@example.com",
};

function renderClosed() {
	const onClose = vi.fn();
	const utils = renderWithQuery(
		<ConfirmDeleteUserDialog
			user={null}
			onClose={onClose}
		/>,
	);
	return { ...utils, onClose };
}

function renderOpen(user = target) {
	const onClose = vi.fn();
	const utils = renderWithQuery(
		<ConfirmDeleteUserDialog
			user={user}
			onClose={onClose}
		/>,
	);
	return { ...utils, onClose };
}

describe("ConfirmDeleteUserDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders no alertdialog when user is null", () => {
		renderClosed();

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("shows the user's name and email in the body when open", () => {
		renderOpen();

		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /delete user\?/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/Target User/)).toBeInTheDocument();
		expect(screen.getByText(/target@example\.com/)).toBeInTheDocument();
	});

	it("calls onClose when Cancel is clicked, without firing DELETE", async () => {
		const user = userEvent.setup();
		const { onClose } = renderOpen();

		await user.click(screen.getByRole("button", { name: /cancel/i }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(mockedAxios.delete).not.toHaveBeenCalled();
	});

	it("DELETEs /api/users/:id on confirm and calls onClose on success", async () => {
		mockedAxios.delete.mockResolvedValueOnce({ status: 204, data: "" });

		const user = userEvent.setup();
		const { onClose } = renderOpen();

		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		await waitFor(() => {
			expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
		});
		const [url, config] = mockedAxios.delete.mock.calls[0];
		expect(url).toBe(`/api/users/${target.id}`);
		expect(config).toMatchObject({ withCredentials: true });

		await waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
	});

	it("surfaces the server's error message and keeps the dialog open on failure", async () => {
		mockedAxios.delete.mockRejectedValueOnce({
			isAxiosError: true,
			response: {
				data: { error: "Admin users cannot be deleted" },
				status: 403,
			},
		});

		const user = userEvent.setup();
		const { onClose } = renderOpen();

		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		expect(
			await screen.findByText("Admin users cannot be deleted"),
		).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("falls back to a generic error when the server provides none", async () => {
		mockedAxios.delete.mockRejectedValueOnce({
			isAxiosError: true,
			response: { data: {}, status: 500 },
		});

		const user = userEvent.setup();
		renderOpen();

		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		expect(
			await screen.findByText("Failed to delete user"),
		).toBeInTheDocument();
	});

	it("disables both buttons and shows 'Deleting...' while pending", async () => {
		// Pending promise — never resolves so we can observe the loading UI.
		mockedAxios.delete.mockReturnValue(new Promise(() => {}));

		const user = userEvent.setup();
		renderOpen();

		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		const submitBtn = await screen.findByRole("button", {
			name: /deleting\.\.\./i,
		});
		expect(submitBtn).toBeDisabled();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
	});
});
