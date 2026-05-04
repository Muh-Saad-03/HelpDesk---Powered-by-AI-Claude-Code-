import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { renderWithQuery } from "../test/renderWithQuery";
import { UsersPage } from "./UsersPage";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: vi.fn() },
  useSession: () => ({
    data: {
      user: { id: "u-admin", name: "Test Admin", email: "admin@test.local", role: "ADMIN" },
    },
    isPending: false,
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

function renderPage() {
  return renderWithQuery(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>,
  );
}

const adminUser = {
  id: "u1",
  name: "Ada Admin",
  email: "ada@example.com",
  role: "ADMIN" as const,
  createdAt: "2026-01-15T12:00:00.000Z",
};
const agentUser = {
  id: "u2",
  name: "Gus Agent",
  email: "gus@example.com",
  role: "AGENT" as const,
  createdAt: "2026-02-20T08:30:00.000Z",
};

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton placeholders while the request is in flight", () => {
    // Pending promise — query never resolves during this test.
    mockedAxios.get.mockReturnValue(new Promise(() => {}));

    const { container } = renderPage();

    expect(
      screen.getByRole("heading", { name: "Users", level: 1 }),
    ).toBeInTheDocument();

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // 5 skeleton rows × 4 cells (name/email/role/created) = 20.
    expect(skeletons.length).toBe(20);

    // No real user data should be on screen yet.
    expect(screen.queryByText("Ada Admin")).not.toBeInTheDocument();
  });

  it("renders one row per user with formatted columns once data arrives", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { users: [adminUser, agentUser] },
    });

    const { container } = renderPage();

    expect(await screen.findByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByText("Gus Agent")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("gus@example.com")).toBeInTheDocument();

    // Skeletons should be gone after data loads.
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBe(0);
  });

  it("renders role pills with the lowercase role label for each user", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { users: [adminUser, agentUser] },
    });

    renderPage();

    const adminRow = (await screen.findByText("Ada Admin")).closest("tr");
    const agentRow = screen.getByText("Gus Agent").closest("tr");
    expect(adminRow).not.toBeNull();
    expect(agentRow).not.toBeNull();

    expect(within(adminRow as HTMLElement).getByText("admin")).toBeInTheDocument();
    expect(within(agentRow as HTMLElement).getByText("agent")).toBeInTheDocument();
  });

  it("calls /api/users with credentials and an abort signal", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { users: [adminUser] } });

    renderPage();

    await screen.findByText("Ada Admin");

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    const [url, config] = mockedAxios.get.mock.calls[0];
    expect(url).toBe("/api/users");
    expect(config).toMatchObject({ withCredentials: true });
    expect(config?.signal).toBeInstanceOf(AbortSignal);
  });

  it("shows the empty state when the server returns no users", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { users: [] } });

    renderPage();

    expect(await screen.findByText("No users found.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an error alert when the request fails", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("Network down"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /failed to load users: network down/i,
    );
  });
});
