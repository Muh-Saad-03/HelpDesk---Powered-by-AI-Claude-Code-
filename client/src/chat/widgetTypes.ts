// Node vocabulary for chat widgets. This mirrors the subset of ChatKit
// Studio's widget JSON we support (widgets are designed in the Widget
// Builder at chatkit.studio and exported as JSON) — we render the tree
// ourselves in WidgetRenderer since ChatKit has no standalone renderer.
//
// Templates extend the ChatKit format with two binding conventions applied
// by bind.ts before rendering:
//   - string props may contain {{path.to.value}} placeholders
//   - a node with `repeat: "path.to.array"` is cloned per element, with
//     `item` and `index` in scope for its own placeholders

export const WIDGET_NODE_TYPES = [
	"Card",
	"ListView",
	"ListViewItem",
	"Box",
	"Row",
	"Col",
	"Text",
	"Title",
	"Caption",
	"Markdown",
	"Badge",
	"Divider",
	"Image",
	"Icon",
	"Button",
	"Spacer",
] as const;
export type WidgetNodeType = (typeof WIDGET_NODE_TYPES)[number];

export type WidgetAction = {
	type: string;
	payload?: Record<string, unknown>;
};

export type WidgetBorder = {
	size?: number;
	color?: string;
	style?: string;
};

export type WidgetCardAction = {
	label?: string;
	action?: WidgetAction;
};

export type WidgetNode = {
	type: WidgetNodeType | (string & {});
	id?: string;
	key?: string;
	children?: WidgetNode[];
	/** Binding extension (ours, not ChatKit's): clone this node per array element. */
	repeat?: string;
	/** Text-bearing nodes (Text/Title/Caption/Markdown/Badge/Button). */
	value?: string;
	label?: string;
	/** Fired via onAction when a Button / clickable ListViewItem is activated. */
	onClickAction?: WidgetAction;
	/** Card footer actions (ChatKit Card `confirm` / `cancel`). */
	confirm?: WidgetCardAction;
	cancel?: WidgetCardAction;
	src?: string;
	alt?: string;
	name?: string;
	color?: string;
	background?: string;
	border?: WidgetBorder;
	radius?: string;
	gap?: number;
	/** Number = 4px grid; object = ChatKit's `{ x, y }` axis shorthand. */
	padding?: number | { x?: number; y?: number };
	align?: string;
	justify?: string;
	/** Square dimension on the 4px grid (ChatKit Box `size: 10` → 40px). */
	size?: string | number;
	/** Numbers are px (ChatKit event bars use `width: 4`); strings pass through. */
	width?: string | number;
	height?: string | number;
	flex?: string;
	weight?: string;
	// ChatKit exports carry more props than we map — tolerate and ignore them.
	[key: string]: unknown;
};
