/** @format */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { renderWithQuery } from "../test/renderWithQuery";
import { UserFormDialog } from "./UserFormDialog";

// Base UI's Dialog steals focus back to the first focusable element after
// userEvent.type fires its pointer events, which causes typed characters to
// land in the Name input instead of the intended one. Setting the value via
// fireEvent.change bypasses the focus machinery and triggers RHF's onChange
// the same way a real keystroke would.
function fillField(input: HTMLElement, value: string) {
	fireEvent.change(input, { target: { value } });
}

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const editTarget = {
	id: "u-existing",
	name: "Existing User",
	email: "existing@example.com",
};

function renderDialog() {
	const onClose = vi.fn();
	const utils = renderWithQuery(
		<UserFormDialog state={{ mode: "create" }} onClose={onClose} />,
	);
	return { ...utils, onClose };
}

function renderEdit(user = editTarget) {
	const onClose = vi.fn();
	const utils = renderWithQuery(
		<UserFormDialog
			state={{ mode: "edit", user }}
			onClose={onClose}
		/>,
	);
	return { ...utils, onClose };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/^name$/i), "Jane Doe");
	await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
	await user.type(screen.getByLabelText(/^password$/i), "password123");
}

describe("UserFormDialog — create mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the three form fields with placeholders when open", () => {
		renderDialog();

		expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Full Name")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("person@example.com"),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Minimum of 8 characters"),
		).toBeInTheDocument();
	});

	it("shows zod validation errors and does not submit when fields are invalid", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.type(screen.getByLabelText(/^name$/i), "ab");
		await user.type(screen.getByLabelText(/^email$/i), "not-an-email");
		await user.type(screen.getByLabelText(/^password$/i), "short");
		await user.click(screen.getByRole("button", { name: /^create user$/i }));

		expect(
			await screen.findByText("Name must be at least 3 characters"),
		).toBeInTheDocument();
		expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
		expect(screen.getByText("Minimum of 8 characters")).toBeInTheDocument();

		expect(mockedAxios.post).not.toHaveBeenCalled();
	});

	it("posts the form values to /api/users and closes the dialog on success", async () => {
		mockedAxios.post.mockResolvedValueOnce({
			data: {
				user: {
					id: "u-new",
					name: "Jane Doe",
					email: "jane@example.com",
					role: "AGENT",
					createdAt: "2026-05-03T00:00:00.000Z",
				},
			},
		});

		const user = userEvent.setup();
		const { onClose } = renderDialog();

		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /^create user$/i }));

		await waitFor(() => {
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
		});

		const [url, body, config] = mockedAxios.post.mock.calls[0];
		expect(url).toBe("/api/users");
		expect(body).toEqual({
			name: "Jane Doe",
			email: "jane@example.com",
			password: "password123",
		});
		expect(config).toMatchObject({ withCredentials: true });

		await waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
	});

	it("surfaces the server's error message and keeps the dialog open on failure", async () => {
		mockedAxios.post.mockRejectedValueOnce({
			isAxiosError: true,
			response: { data: { error: "Email already in use" }, status: 409 },
		});

		const user = userEvent.setup();
		const { onClose } = renderDialog();

		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /^create user$/i }));

		expect(
			await screen.findByText("Email already in use"),
		).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("falls back to a generic error message when the server provides none", async () => {
		mockedAxios.post.mockRejectedValueOnce({
			isAxiosError: true,
			response: { data: {}, status: 500 },
		});

		const user = userEvent.setup();
		renderDialog();

		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /^create user$/i }));

		expect(
			await screen.findByText("Failed to create user"),
		).toBeInTheDocument();
	});

	it("calls onClose when Cancel is clicked, without submitting", async () => {
		const user = userEvent.setup();
		const { onClose } = renderDialog();

		await user.click(screen.getByRole("button", { name: /cancel/i }));

		expect(onClose).toHaveBeenCalled();
		expect(mockedAxios.post).not.toHaveBeenCalled();
	});

	it("disables both buttons and shows 'Creating...' while the request is pending", async () => {
		// Pending promise — never resolves so we can observe the loading UI.
		mockedAxios.post.mockReturnValue(new Promise(() => {}));

		const user = userEvent.setup();
		renderDialog();

		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /^create user$/i }));

		const submitBtn = await screen.findByRole("button", {
			name: /creating\.\.\./i,
		});
		expect(submitBtn).toBeDisabled();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
	});
});

describe("UserFormDialog — edit mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("pre-populates the form with the user's name and email, and uses edit-mode labels", () => {
		renderEdit();

		expect(
			screen.getByRole("heading", { name: /edit user/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/^name$/i)).toHaveValue("Existing User");
		expect(screen.getByLabelText(/^email$/i)).toHaveValue(
			"existing@example.com",
		);
		expect(screen.getByLabelText(/^password$/i)).toHaveValue("");
		expect(
			screen.getByPlaceholderText(/leave blank to keep current password/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^save changes$/i }),
		).toBeInTheDocument();
	});

	it("PATCHes /api/users/:id with empty password when none is typed", async () => {
		mockedAxios.patch.mockResolvedValueOnce({
			data: { user: { ...editTarget, role: "AGENT", createdAt: "x" } },
		});

		const user = userEvent.setup();
		const { onClose } = renderEdit();

		await user.click(screen.getByRole("button", { name: /^save changes$/i }));

		await waitFor(() => {
			expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
		});

		const [url, body, config] = mockedAxios.patch.mock.calls[0];
		expect(url).toBe(`/api/users/${editTarget.id}`);
		expect(body).toEqual({
			name: editTarget.name,
			email: editTarget.email,
			password: "",
		});
		expect(config).toMatchObject({ withCredentials: true });

		await waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
	});

	it("PATCHes with the new password when the admin types one", async () => {
		mockedAxios.patch.mockResolvedValueOnce({
			data: { user: { ...editTarget, role: "AGENT", createdAt: "x" } },
		});

		const user = userEvent.setup();
		renderEdit();

		fillField(screen.getByLabelText(/^password$/i), "newpassword456");
		await user.click(screen.getByRole("button", { name: /^save changes$/i }));

		await waitFor(() => {
			expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
		});

		const [, body] = mockedAxios.patch.mock.calls[0];
		expect(body).toMatchObject({ password: "newpassword456" });
	});

	it("blocks submit with a typed-but-too-short password", async () => {
		const user = userEvent.setup();
		renderEdit();

		fillField(screen.getByLabelText(/^password$/i), "short");
		await user.click(screen.getByRole("button", { name: /^save changes$/i }));

		expect(
			await screen.findByText("Minimum of 8 characters"),
		).toBeInTheDocument();
		expect(mockedAxios.patch).not.toHaveBeenCalled();
	});

	it("surfaces server errors and keeps the dialog open on failure", async () => {
		mockedAxios.patch.mockRejectedValueOnce({
			isAxiosError: true,
			response: { data: { error: "Email already in use" }, status: 409 },
		});

		const user = userEvent.setup();
		const { onClose } = renderEdit();

		await user.click(screen.getByRole("button", { name: /^save changes$/i }));

		expect(
			await screen.findByText("Email already in use"),
		).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("repopulates the form when switched to a different user", async () => {
		const onClose = vi.fn();
		const { rerender, queryClient } = renderWithQuery(
			<UserFormDialog
				state={{ mode: "edit", user: editTarget }}
				onClose={onClose}
			/>,
		);

		expect(screen.getByLabelText(/^name$/i)).toHaveValue("Existing User");

		const other = {
			id: "u-other",
			name: "Other Person",
			email: "other@example.com",
		};
		// rerender replaces the entire tree, so we have to re-include the
		// provider that renderWithQuery added on the initial render.
		rerender(
			<QueryClientProvider client={queryClient}>
				<UserFormDialog
					state={{ mode: "edit", user: other }}
					onClose={onClose}
				/>
			</QueryClientProvider>,
		);

		await waitFor(() => {
			expect(screen.getByLabelText(/^name$/i)).toHaveValue("Other Person");
		});
		expect(screen.getByLabelText(/^email$/i)).toHaveValue("other@example.com");
	});
});
