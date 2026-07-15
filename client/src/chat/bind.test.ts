import { describe, it, expect } from "vitest";
import { bindWidget } from "./bind";
import type { WidgetNode } from "./widgetTypes";

describe("bindWidget", () => {
	it("resolves an exact placeholder to the raw value", () => {
		const bound = bindWidget(
			{ type: "Text", value: "{{total}}" },
			{ total: 42 },
		);
		expect(bound.value).toBe(42);
	});

	it("string-interpolates mixed placeholders", () => {
		const bound = bindWidget(
			{ type: "Text", value: "{{total}} matches on page {{page}}" },
			{ total: 3, page: 2 },
		);
		expect(bound.value).toBe("3 matches on page 2");
	});

	it("resolves nested paths and renders missing paths as empty string", () => {
		const bound = bindWidget(
			{ type: "Text", value: "{{assignee.name}} / {{assignee.phone}}" },
			{ assignee: { name: "Sam" } },
		);
		expect(bound.value).toBe("Sam / ");
	});

	it("binds placeholders inside nested objects like onClickAction", () => {
		const bound = bindWidget(
			{
				type: "Button",
				label: "Open",
				onClickAction: { type: "open_ticket", payload: { ticketId: "{{id}}" } },
			},
			{ id: "t_1" },
		);
		expect(bound.onClickAction?.payload?.ticketId).toBe("t_1");
	});

	it("clones a repeat node per array element with item and index in scope", () => {
		const template: WidgetNode = {
			type: "ListView",
			children: [
				{
					type: "ListViewItem",
					repeat: "tickets",
					children: [{ type: "Text", value: "{{index}}: {{item.subject}}" }],
				},
			],
		};
		const bound = bindWidget(template, {
			tickets: [{ subject: "Broken login" }, { subject: "Refund please" }],
		});

		expect(bound.children).toHaveLength(2);
		expect(bound.children?.[0].children?.[0].value).toBe("0: Broken login");
		expect(bound.children?.[1].children?.[0].value).toBe("1: Refund please");
	});

	it("drops a repeat node when the path is not an array", () => {
		const bound = bindWidget(
			{
				type: "ListView",
				children: [{ type: "ListViewItem", repeat: "tickets" }],
			},
			{},
		);
		expect(bound.children).toHaveLength(0);
	});

	it("does not mutate the template", () => {
		const template: WidgetNode = { type: "Text", value: "{{name}}" };
		bindWidget(template, { name: "x" });
		expect(template.value).toBe("{{name}}");
	});
});
