import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    // 5 skeleton rows × 5 cells (name/email/role/created/actions) = 25.
    expect(skeletons.length).toBe(25);

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

// Unique text from CreateUserDialog's body — used as the "is the dialog open?"
// probe. Picked over the title "New User" because the trigger button shares
// that label, and over field labels because they may be present in the DOM
// briefly during close animations.
const dialogBodyMatcher = /create a new agent account/i;

describe("UsersPage — create-user dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: { users: [] } });
  });

  it("opens the dialog when the New User button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for the initial query to settle so the page has finished its first render.
    await screen.findByText("No users found.");

    expect(screen.queryByText(dialogBodyMatcher)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new user/i }));

    expect(await screen.findByText(dialogBodyMatcher)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("closes the dialog when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("No users found.");
    await user.click(screen.getByRole("button", { name: /new user/i }));
    await screen.findByText(dialogBodyMatcher);

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByText(dialogBodyMatcher)).not.toBeInTheDocument();
    });
  });

  it("closes the dialog when clicking outside (the backdrop)", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("No users found.");
    await user.click(screen.getByRole("button", { name: /new user/i }));
    await screen.findByText(dialogBodyMatcher);

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByText(dialogBodyMatcher)).not.toBeInTheDocument();
    });
  });
});

describe("UsersPage — edit-user dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the dialog in edit mode pre-populated when a row's edit button is clicked", async () => {
    const adaUser = {
      id: "u-ada",
      name: "Ada Admin",
      email: "ada@example.com",
      role: "ADMIN" as const,
      createdAt: "2026-01-15T12:00:00.000Z",
    };
    mockedAxios.get.mockResolvedValueOnce({ data: { users: [adaUser] } });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Ada Admin");

    expect(
      screen.queryByRole("heading", { name: /edit user/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /edit ada admin/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /edit user/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Ada Admin");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("ada@example.com");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /^save changes$/i }),
    ).toBeInTheDocument();
  });
});
