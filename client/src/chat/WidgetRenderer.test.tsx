import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolResultWidget, WidgetRenderer } from "./WidgetRenderer";
import type { WidgetNode } from "./widgetTypes";

describe("WidgetRenderer", () => {
	it("renders a card tree with text, title, caption, and badge", () => {
		const node: WidgetNode = {
			type: "Card",
			children: [
				{ type: "Title", value: "Broken login" },
				{ type: "Caption", value: "Jane · Jul 15, 2026" },
				{ type: "Text", value: "I can't sign in." },
				{ type: "Badge", value: "shiny" },
			],
		};
		render(<WidgetRenderer node={node} />);

		expect(screen.getByText("Broken login")).toBeInTheDocument();
		expect(screen.getByText("Jane · Jul 15, 2026")).toBeInTheDocument();
		expect(screen.getByText("I can't sign in.")).toBeInTheDocument();
		expect(screen.getByText("shiny")).toBeInTheDocument();
	});

	it("renders ticket statuses with the app's status pill", () => {
		render(<WidgetRenderer node={{ type: "Badge", value: "OPEN" }} />);
		expect(screen.getByText("open")).toBeInTheDocument();
	});

	it("renders list views as lists and fires item click actions", async () => {
		const onAction = vi.fn();
		const node: WidgetNode = {
			type: "ListView",
			children: [
				{
					type: "ListViewItem",
					onClickAction: { type: "open_ticket", payload: { ticketId: "t_1" } },
					children: [{ type: "Text", value: "Broken login" }],
				},
			],
		};
		render(<WidgetRenderer node={node} onAction={onAction} />);

		expect(screen.getByRole("list")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button"));
		expect(onAction).toHaveBeenCalledWith({
			type: "open_ticket",
			payload: { ticketId: "t_1" },
		});
	});

	it("fires button actions", async () => {
		const onAction = vi.fn();
		render(
			<WidgetRenderer
				node={{
					type: "Button",
					label: "Open ticket",
					onClickAction: { type: "open_ticket", payload: { ticketId: "t_2" } },
				}}
				onAction={onAction}
			/>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open ticket" }));
		expect(onAction).toHaveBeenCalledWith({
			type: "open_ticket",
			payload: { ticketId: "t_2" },
		});
	});

	it("renders markdown content", () => {
		render(
			<WidgetRenderer node={{ type: "Markdown", value: "some **bold** text" }} />,
		);
		expect(screen.getByText("bold")).toBeInTheDocument();
	});

	it("renders Card confirm/cancel footers and fires their actions", async () => {
		const onAction = vi.fn();
		const node: WidgetNode = {
			type: "Card",
			confirm: { label: "Add to calendar", action: { type: "calendar.add" } },
			cancel: { label: "Discard", action: { type: "calendar.discard" } },
			children: [{ type: "Title", value: "Friday" }],
		};
		render(<WidgetRenderer node={node} onAction={onAction} />);

		await userEvent.click(
			screen.getByRole("button", { name: "Add to calendar" }),
		);
		expect(onAction).toHaveBeenCalledWith({ type: "calendar.add" });

		await userEvent.click(screen.getByRole("button", { name: "Discard" }));
		expect(onAction).toHaveBeenCalledWith({ type: "calendar.discard" });
	});

	it("renders badges from a label prop with a semantic color", () => {
		render(
			<WidgetRenderer node={{ type: "Badge", label: "Active", color: "success" }} />,
		);
		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("applies ChatKit box dimensions and backgrounds as inline styles", () => {
		const node: WidgetNode = {
			type: "Box",
			size: 10,
			background: "blue-500",
			radius: "full",
			children: [{ type: "Icon", name: "empty-circle", color: "white", size: "sm" }],
		};
		const { container } = render(<WidgetRenderer node={node} />);
		const box = container.firstElementChild as HTMLElement;

		expect(box.style.width).toBe("40px");
		expect(box.style.height).toBe("40px");
		expect(box.style.borderRadius).toBe("9999px");
	});

	it("degrades unknown node types to their children", () => {
		const node: WidgetNode = {
			type: "FancyNewContainer",
			children: [{ type: "Text", value: "still visible" }],
		};
		render(<WidgetRenderer node={node} />);
		expect(screen.getByText("still visible")).toBeInTheDocument();
	});
});

describe("ToolResultWidget", () => {
	it("renders the registered widget bound to the tool output", () => {
		render(
			<ToolResultWidget
				toolName='search_tickets'
				output={{
					tickets: [
						{
							id: "t_1",
							subject: "Broken login",
							status: "OPEN",
							fromName: "Jane",
							fromEmail: "jane@example.com",
							createdAt: "2026-07-01T10:00:00.000Z",
						},
					],
					total: 1,
					page: 1,
					pageSize: 10,
				}}
			/>,
		);

		expect(screen.getByText("Tickets")).toBeInTheDocument();
		expect(screen.getByText("Broken login")).toBeInTheDocument();
		expect(screen.getByText("1 match")).toBeInTheDocument();
	});

	it("renders the reply-sent widget for reply_to_ticket output", () => {
		render(
			<ToolResultWidget
				toolName='reply_to_ticket'
				output={{
					reply: {
						id: "r1",
						body: "A refund has been issued.",
						createdAt: "2026-07-15T10:00:00.000Z",
					},
				}}
			/>,
		);

		expect(screen.getByText("Reply sent")).toBeInTheDocument();
		expect(screen.getByText("A refund has been issued.")).toBeInTheDocument();
	});

	it("falls back to a JSON summary for unregistered tools", () => {
		render(<ToolResultWidget toolName='mystery_tool' output={{ answer: 7 }} />);
		expect(screen.getByText(/"answer"/)).toBeInTheDocument();
	});

	it("shows the error text when the tool output is an error", () => {
		render(
			<ToolResultWidget
				toolName='get_ticket'
				output={{ error: "Ticket not found" }}
			/>,
		);
		expect(screen.getByText("Ticket not found")).toBeInTheDocument();
	});
});
