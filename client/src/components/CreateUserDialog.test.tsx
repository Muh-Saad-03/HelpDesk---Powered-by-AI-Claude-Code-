/** @format */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { renderWithQuery } from "../test/renderWithQuery";
import { CreateUserDialog } from "./CreateUserDialog";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

function renderDialog() {
	const onOpenChange = vi.fn();
	const utils = renderWithQuery(
		<CreateUserDialog open={true} onOpenChange={onOpenChange} />,
	);
	return { ...utils, onOpenChange };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/^name$/i), "Jane Doe");
	await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
	await user.type(screen.getByLabelText(/^password$/i), "password123");
}

describe("CreateUserDialog", () => {
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
		const { onOpenChange } = renderDialog();

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
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it("surfaces the server's error message and keeps the dialog open on failure", async () => {
		mockedAxios.post.mockRejectedValueOnce({
			isAxiosError: true,
			response: { data: { error: "Email already in use" }, status: 409 },
		});

		const user = userEvent.setup();
		const { onOpenChange } = renderDialog();

		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /^create user$/i }));

		expect(
			await screen.findByText("Email already in use"),
		).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
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

	it("calls onOpenChange(false) when Cancel is clicked, without submitting", async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderDialog();

		await user.click(screen.getByRole("button", { name: /cancel/i }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
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
