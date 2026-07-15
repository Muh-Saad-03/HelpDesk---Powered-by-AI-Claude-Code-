import Markdown from "react-markdown";
import {
	Calendar,
	Check,
	Circle,
	CircleAlert,
	CircleCheck,
	CircleCheckBig,
	Clock,
	Mail,
	MessageSquare,
	Search,
	Ticket,
	User,
	type LucideIcon,
} from "lucide-react";
import { TicketStatus } from "core";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/ticket-fields";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import { bindWidget } from "./bind";
import type { WidgetAction, WidgetNode } from "./widgetTypes";

export type OnWidgetAction = (action: WidgetAction) => void;

// Named lookup instead of importing the full lucide barrel — keeps the
// bundle small; unmapped names fall back to a plain dot.
const ICONS: Record<string, LucideIcon> = {
	calendar: Calendar,
	check: Check,
	clock: Clock,
	mail: Mail,
	message: MessageSquare,
	search: Search,
	ticket: Ticket,
	user: User,
	alert: CircleAlert,
	"empty-circle": Circle,
	"check-circle": CircleCheck,
	"check-circle-filled": CircleCheckBig,
};

const ICON_SIZES: Record<string, string> = {
	sm: "size-3.5",
	md: "size-4",
	lg: "size-5",
	xl: "size-6",
};

// ChatKit color tokens → CSS. Palette names cover what the Studio templates
// emit; surface-* map onto the app theme so widgets follow light/dark mode.
const COLORS: Record<string, string> = {
	white: "#ffffff",
	"blue-400": "#60a5fa",
	"blue-500": "#3b82f6",
	"green-500": "#22c55e",
	"gray-500": "#6b7280",
	"red-400": "#f87171",
	"surface-secondary": "var(--muted)",
	"surface-elevated-secondary": "var(--muted)",
	"alpha-10": "color-mix(in srgb, currentColor 10%, transparent)",
};

const TEXT_COLORS: Record<string, string> = {
	secondary: "var(--muted-foreground)",
	tertiary: "var(--muted-foreground)",
	white: "#ffffff",
};

const RADII: Record<string, string> = {
	sm: "6px",
	md: "8px",
	lg: "12px",
	xl: "16px",
	"2xl": "20px",
	full: "9999px",
};

const TEXT_SIZES: Record<string, string> = {
	xs: "text-xs",
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
	xl: "text-xl",
	"2xl": "text-2xl",
	"3xl": "text-3xl",
};

const BADGE_COLORS: Record<string, string> = {
	success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
	warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
	danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
	info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

const TICKET_STATUSES = Object.values(TicketStatus) as string[];

function nodeText(node: WidgetNode): string {
	return String(node.value ?? node.label ?? "");
}

function renderChildren(node: WidgetNode, onAction?: OnWidgetAction) {
	return node.children?.map((child, i) => (
		<WidgetRenderer key={child.key ?? child.id ?? i} node={child} onAction={onAction} />
	));
}

// Dimension conventions from the Studio exports: `gap`/`padding`/`size` sit
// on the 4px grid, bare `width`/`height` numbers are px (event color bars
// use width: 4), strings pass through. Inline styles are safer than dynamic
// Tailwind class names under Tailwind v4.
function px(value: string | number | undefined): string | undefined {
	if (value == null) return undefined;
	return typeof value === "number" ? `${value}px` : value;
}

function boxStyle(node: WidgetNode): React.CSSProperties {
	const style: React.CSSProperties = {};
	if (typeof node.gap === "number") style.gap = node.gap * 4;
	if (typeof node.padding === "number") style.padding = node.padding * 4;
	else if (node.padding && typeof node.padding === "object") {
		if (typeof node.padding.x === "number") {
			style.paddingLeft = style.paddingRight = node.padding.x * 4;
		}
		if (typeof node.padding.y === "number") {
			style.paddingTop = style.paddingBottom = node.padding.y * 4;
		}
	}
	if (typeof node.align === "string") {
		style.alignItems = node.align === "start" ? "flex-start" : node.align;
	}
	if (typeof node.justify === "string") style.justifyContent = node.justify;
	if (node.background && node.background !== "none") {
		style.background = COLORS[node.background] ?? "var(--muted)";
	}
	if (node.radius) style.borderRadius = RADII[node.radius] ?? node.radius;
	if (node.border) {
		style.border = `${node.border.size ?? 1}px ${node.border.style ?? "solid"} ${
			COLORS[node.border.color ?? ""] ?? "var(--border)"
		}`;
	}
	if (typeof node.size === "number") {
		style.width = style.height = node.size * 4;
		style.flexShrink = 0;
	}
	if (node.width != null) style.width = px(node.width);
	if (node.height != null) style.height = px(node.height);
	if (node.flex === "auto") style.flex = "1 1 auto";
	return style;
}

function textProps(node: WidgetNode): {
	sizeClass: string | undefined;
	style: React.CSSProperties;
} {
	return {
		sizeClass: typeof node.size === "string" ? TEXT_SIZES[node.size] : undefined,
		style:
			node.color && TEXT_COLORS[node.color] ?
				{ color: TEXT_COLORS[node.color] }
			:	{},
	};
}

function CardFooter({
	node,
	onAction,
}: {
	node: WidgetNode;
	onAction?: OnWidgetAction;
}) {
	if (!node.confirm && !node.cancel) return null;
	return (
		<div className="flex justify-end gap-2 pt-1">
			{node.cancel && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() =>
						node.cancel?.action && onAction ? onAction(node.cancel.action) : undefined
					}>
					{node.cancel.label ?? "Cancel"}
				</Button>
			)}
			{node.confirm && (
				<Button
					type="button"
					size="sm"
					onClick={() =>
						node.confirm?.action && onAction ?
							onAction(node.confirm.action)
						:	undefined
					}>
					{node.confirm.label ?? "Confirm"}
				</Button>
			)}
		</div>
	);
}

export function WidgetRenderer({
	node,
	onAction,
}: {
	node: WidgetNode;
	onAction?: OnWidgetAction;
}) {
	switch (node.type) {
		case "Card":
			return (
				<div
					className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground shadow-bubble"
					style={boxStyle(node)}>
					{renderChildren(node, onAction)}
					<CardFooter node={node} onAction={onAction} />
				</div>
			);
		case "ListView":
			return <ul className="divide-y divide-border">{renderChildren(node, onAction)}</ul>;
		case "ListViewItem": {
			const action = node.onClickAction;
			const content = (
				<div className="flex flex-col gap-1" style={boxStyle(node)}>
					{renderChildren(node, onAction)}
				</div>
			);
			return (
				<li className="py-2 first:pt-0 last:pb-0">
					{action && onAction ?
						<button
							type="button"
							onClick={() => onAction(action)}
							className="-mx-1 block w-full rounded-md px-1 text-left transition-colors hover:bg-muted/60">
							{content}
						</button>
					:	content}
				</li>
			);
		}
		case "Box":
			return (
				<div className="flex items-center justify-center" style={boxStyle(node)}>
					{renderChildren(node, onAction)}
				</div>
			);
		case "Row":
			// flex-wrap: the chat panel is only 384px wide, so rows of tiles from
			// desktop-sized Studio designs must flow instead of clipping.
			return (
				<div
					className="flex flex-row flex-wrap items-center gap-2"
					style={boxStyle(node)}>
					{renderChildren(node, onAction)}
				</div>
			);
		case "Col":
			return (
				<div className="flex flex-col gap-1" style={boxStyle(node)}>
					{renderChildren(node, onAction)}
				</div>
			);
		case "Text": {
			const { sizeClass, style } = textProps(node);
			return (
				<span className={cn("min-w-0 truncate text-sm", sizeClass)} style={style}>
					{nodeText(node)}
				</span>
			);
		}
		case "Title": {
			const { sizeClass, style } = textProps(node);
			return (
				<div
					className={cn("font-heading text-sm font-semibold", sizeClass)}
					style={style}>
					{nodeText(node)}
				</div>
			);
		}
		case "Caption": {
			const { sizeClass, style } = textProps(node);
			return (
				<span
					className={cn("text-xs text-muted-foreground", sizeClass)}
					style={style}>
					{nodeText(node)}
				</span>
			);
		}
		case "Markdown":
			return (
				<div className="text-sm [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-4">
					<Markdown>{nodeText(node)}</Markdown>
				</div>
			);
		case "Badge": {
			const text = nodeText(node);
			// Ticket statuses get the app's own pill; anything else a colored one.
			if (TICKET_STATUSES.includes(text)) {
				return <StatusPill status={text as TicketStatus} />;
			}
			return (
				<span
					className={cn(
						"inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase",
						BADGE_COLORS[node.color ?? ""] ?? "bg-secondary text-secondary-foreground",
					)}>
					{text}
				</span>
			);
		}
		case "Divider":
			return <Separator />;
		case "Image":
			return (
				<img
					src={typeof node.src === "string" ? node.src : undefined}
					alt={typeof node.alt === "string" ? node.alt : ""}
					className="max-w-full rounded-md"
				/>
			);
		case "Icon": {
			const IconCmp = node.name ? ICONS[node.name.toLowerCase()] : undefined;
			if (!IconCmp) {
				return <span aria-hidden className="size-1.5 rounded-full bg-current" />;
			}
			const sizeClass =
				(typeof node.size === "string" && ICON_SIZES[node.size]) || "size-4";
			return (
				<IconCmp
					className={cn(sizeClass, "shrink-0", !node.color && "text-muted-foreground")}
					style={
						node.color && TEXT_COLORS[node.color] ?
							{ color: TEXT_COLORS[node.color] }
						:	undefined
					}
				/>
			);
		}
		case "Button":
			return (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() =>
						node.onClickAction && onAction ? onAction(node.onClickAction) : undefined
					}>
					{nodeText(node)}
				</Button>
			);
		case "Spacer":
			return <span className="flex-1" />;
		default:
			// Unknown node type from a newer ChatKit export — degrade to children.
			return <>{renderChildren(node, onAction)}</>;
	}
}

/**
 * Renders a tool result as its registered widget; falls back to a compact
 * text summary when no template is registered or the tool reported an error.
 */
export function ToolResultWidget({
	toolName,
	output,
	onAction,
}: {
	toolName: string;
	output: unknown;
	onAction?: OnWidgetAction;
}) {
	const entry = WIDGET_REGISTRY[toolName];
	const isError =
		output != null &&
		typeof output === "object" &&
		typeof (output as { error?: unknown }).error === "string";

	if (!entry || isError) {
		const text =
			isError ?
				String((output as { error: string }).error)
			:	JSON.stringify(output, null, 1);
		return (
			<div
				className={cn(
					"rounded-xl border bg-muted/40 px-3 py-2 text-xs",
					isError ? "text-foreground" : "font-mono break-all whitespace-pre-wrap",
				)}>
				{text}
			</div>
		);
	}

	const data = entry.transform ? entry.transform(output) : output;
	return <WidgetRenderer node={bindWidget(entry.template, data)} onAction={onAction} />;
}
