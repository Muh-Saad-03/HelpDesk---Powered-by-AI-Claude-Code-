import type { WidgetNode } from "./widgetTypes";

// Tiny template engine for widget JSON. Two rules only (documented in
// widgetTypes.ts): {{path}} interpolation and `repeat` cloning. Formatting
// (dates, percentages, …) belongs in a registry `transform`, not here.

function getPath(data: unknown, path: string): unknown {
	let current: unknown = data;
	for (const key of path.split(".")) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

const EXACT_PLACEHOLDER = /^\{\{\s*([^{}]+?)\s*\}\}$/;
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

function bindString(value: string, context: unknown): unknown {
	// A string that is exactly one placeholder resolves to the raw value so
	// numbers/booleans survive (e.g. "{{total}}" → 42, not "42").
	const exact = value.match(EXACT_PLACEHOLDER);
	if (exact) return getPath(context, exact[1]);
	return value.replace(PLACEHOLDER, (_, path: string) => {
		const resolved = getPath(context, path.trim());
		return resolved == null ? "" : String(resolved);
	});
}

function bindValue(value: unknown, context: unknown): unknown {
	if (typeof value === "string") return bindString(value, context);
	if (Array.isArray(value)) return value.map((v) => bindValue(v, context));
	if (value != null && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) out[k] = bindValue(v, context);
		return out;
	}
	return value;
}

function bindNode(node: WidgetNode, context: unknown): WidgetNode[] {
	if (node.repeat) {
		const items = getPath(context, node.repeat);
		if (!Array.isArray(items)) return [];
		return items.flatMap((item, index) => {
			const { repeat: _repeat, ...rest } = node;
			return bindNode(rest as WidgetNode, { ...asObject(context), item, index });
		});
	}

	const bound: WidgetNode = {} as WidgetNode;
	for (const [key, value] of Object.entries(node)) {
		if (key === "children") continue;
		(bound as Record<string, unknown>)[key] = bindValue(value, context);
	}
	if (node.children) {
		bound.children = node.children.flatMap((child) => bindNode(child, context));
	}
	return [bound];
}

function asObject(context: unknown): Record<string, unknown> {
	return context != null && typeof context === "object" ?
			(context as Record<string, unknown>)
		:	{};
}

/** Resolve a widget template against tool-output data. Pure; template is not mutated. */
export function bindWidget(template: WidgetNode, data: unknown): WidgetNode {
	const [bound] = bindNode(template, data);
	return bound ?? { type: "Box", children: [] };
}
