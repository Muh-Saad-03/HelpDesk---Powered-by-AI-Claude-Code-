import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { Role } from "core";
import { renderWithQuery } from "../test/renderWithQuery";
import { Home } from "./Home";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: vi.fn() },
  useSession: () => ({
    data: {
      user: {
        id: "u-admin",
        name: "Test Admin",
        email: "admin@test.local",
        role: Role.ADMIN,
      },
    },
    isPending: false,
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

function renderPage() {
  return renderWithQuery(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

function makeDaily(): { date: string; count: number }[] {
  return Array.from({ length: 30 }, (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, "0")}`,
    count: i,
  }));
}

describe("Home (Dashboard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeletons in every metric card and the chart while loading", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));

    const { container } = renderPage();

    expect(
      screen.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeInTheDocument();

    // 5 metric cards + 1 chart placeholder = 6 skeletons.
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(6);
  });

  it("renders all five metrics formatted correctly", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        total: 1234,
        open: 56,
        aiResolved: 800,
        aiResolvedPct: 64.8,
        // 1h 30m = 5,400,000 ms
        avgResolutionMs: 5_400_000,
        daily: makeDaily(),
      },
    });

    renderPage();

    expect(await screen.findByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("800")).toBeInTheDocument();
    expect(screen.getByText("64.8%")).toBeInTheDocument();
    // 5,400,000 ms / 60000 = 90 minutes → "1.5h"
    expect(screen.getByText("1.5h")).toBeInTheDocument();
  });

  it("renders the tickets-per-day bar chart with one bar per data point", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        total: 100,
        open: 10,
        aiResolved: 50,
        aiResolvedPct: 50,
        avgResolutionMs: 60_000,
        daily: makeDaily(),
      },
    });

    renderPage();

    // Wait for the metric to appear — that means the query resolved and
    // the chart body has switched from Skeleton to bars.
    await screen.findByText("100");

    expect(
      screen.getByText(/tickets per day \(last 30 days\)/i),
    ).toBeInTheDocument();
    const chart = screen.getByLabelText(/bar chart of tickets per day/i);
    // 30 bars expected (one per data point).
    expect(chart.querySelectorAll('[title*="ticket"]').length).toBe(30);
  });

  it("renders em-dashes when there are no resolved tickets to derive ratios from", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        total: 0,
        open: 0,
        aiResolved: 0,
        aiResolvedPct: null,
        avgResolutionMs: null,
        daily: makeDaily(),
      },
    });

    renderPage();

    // Both null-derived cards should fall back to em-dash.
    const dashes = await screen.findAllByText("—");
    expect(dashes.length).toBe(2);
  });

  it("calls /api/tickets/stats with credentials and an abort signal", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        total: 1,
        open: 1,
        aiResolved: 0,
        aiResolvedPct: 0,
        avgResolutionMs: null,
        daily: makeDaily(),
      },
    });

    renderPage();

    await screen.findByText("0.0%");

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    const [url, config] = mockedAxios.get.mock.calls[0];
    expect(url).toBe("/api/tickets/stats");
    expect(config).toMatchObject({ withCredentials: true });
    expect(config?.signal).toBeInstanceOf(AbortSignal);
  });

  it("shows an error alert when the request fails", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("Server down"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /failed to load stats: server down/i,
    );
  });
});
