import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Role } from "core";
import { NavBar } from "./NavBar";

const useSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({
	authClient: { signOut: vi.fn() },
	useSession: () => useSessionMock(),
	signIn: vi.fn(),
	signOut: vi.fn(),
}));

function renderNavBar() {
	render(
		<MemoryRouter>
			<NavBar />
		</MemoryRouter>,
	);
}

describe("NavBar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows Tickets and Users links when signed in as admin", () => {
		useSessionMock.mockReturnValue({
			data: {
				user: { id: "u1", name: "Ada Admin", email: "ada@x.com", role: Role.ADMIN },
			},
			isPending: false,
		});

		renderNavBar();

		expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
		expect(screen.getByText("Ada Admin")).toBeInTheDocument();
	});

	it("shows Tickets but not Users when signed in as agent", () => {
		useSessionMock.mockReturnValue({
			data: {
				user: { id: "u2", name: "Gus Agent", email: "gus@x.com", role: Role.AGENT },
			},
			isPending: false,
		});

		renderNavBar();

		expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
		expect(screen.getByText("Gus Agent")).toBeInTheDocument();
	});

	it("hides nav links and user controls when there is no session", () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });

		renderNavBar();

		expect(screen.getByRole("link", { name: "Helpdesk" })).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Tickets" })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
	});
});
