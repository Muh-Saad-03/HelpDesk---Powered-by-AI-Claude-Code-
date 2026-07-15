import { describe, it, expect, beforeEach, vi } from "vitest";
import axios, { AxiosError } from "axios";
import { executeVoiceTool } from "./voiceTools";

vi.mock("axios", async () => {
	const actual = await vi.importActual<typeof import("axios")>("axios");
	return {
		...actual,
		default: { get: vi.fn(), post: vi.fn() },
	};
});

const mockedGet = vi.mocked(axios.get);
const mockedPost = vi.mocked(axios.post);

describe("executeVoiceTool", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("search_tickets hits /api/tickets with mapped params and credentials", async () => {
		mockedGet.mockResolvedValueOnce({ data: { tickets: [], total: 0 } });

		const out = await executeVoiceTool(
			"search_tickets",
			JSON.stringify({ query: "refund", status: "OPEN", page: 2 }),
		);

		expect(mockedGet).toHaveBeenCalledWith("/api/tickets", {
			withCredentials: true,
			params: { pageSize: 10, page: 2, q: "refund", status: "OPEN" },
		});
		expect(JSON.parse(out)).toEqual({ tickets: [], total: 0 });
	});

	it("get_ticket hits /api/tickets/:id and unwraps the ticket", async () => {
		mockedGet.mockResolvedValueOnce({
			data: { ticket: { id: "t1", subject: "Hi" } },
		});

		const out = await executeVoiceTool(
			"get_ticket",
			JSON.stringify({ ticket_id: "t1" }),
		);

		expect(mockedGet).toHaveBeenCalledWith("/api/tickets/t1", {
			withCredentials: true,
		});
		expect(JSON.parse(out)).toEqual({ id: "t1", subject: "Hi" });
	});

	it("get_ticket_replies hits /api/tickets/:id/replies", async () => {
		mockedGet.mockResolvedValueOnce({ data: [{ id: "r1" }] });

		const out = await executeVoiceTool(
			"get_ticket_replies",
			JSON.stringify({ ticket_id: "t1" }),
		);

		expect(mockedGet).toHaveBeenCalledWith("/api/tickets/t1/replies", {
			withCredentials: true,
		});
		expect(JSON.parse(out)).toEqual([{ id: "r1" }]);
	});

	it("get_ticket_stats hits /api/tickets/stats", async () => {
		mockedGet.mockResolvedValueOnce({ data: { total: 5 } });

		const out = await executeVoiceTool("get_ticket_stats", "{}");

		expect(mockedGet).toHaveBeenCalledWith("/api/tickets/stats", {
			withCredentials: true,
		});
		expect(JSON.parse(out)).toEqual({ total: 5 });
	});

	it("reply_to_ticket posts to /api/tickets/:id/replies", async () => {
		mockedPost.mockResolvedValueOnce({
			data: { reply: { id: "r9", body: "On it!" } },
		});

		const out = await executeVoiceTool(
			"reply_to_ticket",
			JSON.stringify({ ticket_id: "t1", body: "On it!" }),
		);

		expect(mockedPost).toHaveBeenCalledWith(
			"/api/tickets/t1/replies",
			{ body: "On it!" },
			{ withCredentials: true },
		);
		expect(JSON.parse(out)).toEqual({ reply: { id: "r9", body: "On it!" } });
	});

	it("reply_to_ticket surfaces server errors instead of throwing", async () => {
		const err = new AxiosError("Request failed");
		err.response = { data: { error: "Ticket not found" } } as never;
		mockedPost.mockRejectedValueOnce(err);

		const out = await executeVoiceTool(
			"reply_to_ticket",
			JSON.stringify({ ticket_id: "missing", body: "Hello" }),
		);

		expect(JSON.parse(out)).toEqual({ error: "Ticket not found" });
	});

	it("returns an error string for an unknown tool", async () => {
		const out = await executeVoiceTool("delete_everything", "{}");

		expect(mockedGet).not.toHaveBeenCalled();
		expect(JSON.parse(out)).toEqual({ error: "Unknown tool: delete_everything" });
	});

	it("returns an error string for malformed JSON arguments", async () => {
		const out = await executeVoiceTool("get_ticket", "{not json");

		expect(mockedGet).not.toHaveBeenCalled();
		expect(JSON.parse(out)).toEqual({ error: "Arguments were not valid JSON" });
	});

	it("returns a zod error string for invalid arguments", async () => {
		const out = await executeVoiceTool("get_ticket", "{}");

		expect(mockedGet).not.toHaveBeenCalled();
		expect(JSON.parse(out)).toHaveProperty("error");
	});

	it("surfaces the server's error message on request failure", async () => {
		const err = new AxiosError("Request failed");
		err.response = { data: { error: "Ticket not found" } } as never;
		mockedGet.mockRejectedValueOnce(err);

		const out = await executeVoiceTool(
			"get_ticket",
			JSON.stringify({ ticket_id: "missing" }),
		);

		expect(JSON.parse(out)).toEqual({ error: "Ticket not found" });
	});
});
