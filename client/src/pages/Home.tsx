import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { NavBar } from "../components/NavBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type DailyPoint = { date: string; count: number };

type Stats = {
  total: number;
  open: number;
  aiResolved: number;
  aiResolvedPct: number | null;
  avgResolutionMs: number | null;
  daily: DailyPoint[];
};

function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function formatShortDate(iso: string): string {
  return monthDayFormatter.format(parseLocalDate(iso));
}

type CardSpec = {
  index: string;
  label: string;
  value: string | null;
  hint?: string;
  accent: string;
  trend?: number[];
};

export function Home() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async ({ signal }) => {
      const res = await axios.get<Stats>("/api/tickets/stats", {
        withCredentials: true,
        signal,
      });
      return res.data;
    },
  });

  const trend = data?.daily.map((d) => d.count) ?? [];

  const cards: CardSpec[] = [
    {
      index: "01",
      label: "Total tickets",
      value: data ? data.total.toLocaleString() : null,
      hint: "all-time",
      accent: "bg-primary text-primary",
      trend,
    },
    {
      index: "02",
      label: "Open tickets",
      value: data ? data.open.toLocaleString() : null,
      hint: "awaiting action",
      accent: "bg-status-open text-status-open",
    },
    {
      index: "03",
      label: "Resolved by AI",
      value: data ? data.aiResolved.toLocaleString() : null,
      hint: "auto-closed",
      accent: "bg-signal text-signal",
    },
    {
      index: "04",
      label: "AI resolution rate",
      value: data ? formatPct(data.aiResolvedPct) : null,
      hint: "of resolved",
      accent: "bg-status-resolved text-status-resolved",
    },
    {
      index: "05",
      label: "Avg resolution",
      value: data ? formatDuration(data.avgResolutionMs) : null,
      hint: "time-to-close",
      accent: "bg-status-closed text-status-closed",
    },
  ];

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-5 pt-8 pb-24 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 animate-rise">
          <div>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
              ── Section 01 / Overview
            </span>
            <div className="mt-3 flex items-baseline gap-3 flex-wrap">
              <h1 className="text-4xl font-semibold tracking-tight text-display sm:text-[2.75rem]">
                Dashboard
              </h1>
              <span aria-hidden className="font-mono text-base font-normal tracking-normal text-muted-foreground/70">
                / last 30 days
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
            <span className="status-dot bg-status-resolved text-status-resolved animate-pulse-dot" />
            <span>Live</span>
            <span aria-hidden className="h-3 w-px bg-border" />
            <time>{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>
          </div>
        </div>

        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load stats: {error.message}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Stat grid — floating candy cards */}
            <section
              aria-label="Key metrics"
              className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              {cards.map((c, i) => (
                <MetricTile
                  key={c.label}
                  spec={c}
                  loading={isPending}
                  position={i}
                />
              ))}
            </section>

            {/* Chart panel */}
            <section className="surface-panel overflow-hidden animate-rise" style={{ animationDelay: "240ms" }}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline px-5 py-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                    Series 01
                  </span>
                  <h2 className="text-[15px] font-medium">
                    Tickets per day (last 30 days)
                  </h2>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  <Sparkles className="size-3" />
                  <span>auto-bucketed · local tz</span>
                </div>
              </div>
              <div className="px-5 py-6">
                {isPending || !data ? (
                  <Skeleton className="h-56 w-full" />
                ) : (
                  <ChartBody data={data.daily} />
                )}
              </div>
            </section>

            {/* Footer ribbon */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              <span>End of section 01</span>
              <a
                href="/tickets"
                className="group/link inline-flex items-center gap-1.5 text-foreground transition-colors hover:text-foreground"
              >
                <span>Go to tickets</span>
                <ArrowUpRight className="size-3 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </a>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function MetricTile({
  spec,
  loading,
  position,
}: {
  spec: CardSpec;
  loading: boolean;
  position: number;
}) {
  return (
    <div
      className="group/tile relative flex flex-col gap-3 rounded-2xl bg-surface px-5 py-5 ring-1 ring-foreground/5 shadow-bubble transition-transform hover:-translate-y-0.5 animate-rise"
      style={{ animationDelay: `${position * 60}ms` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">
          {spec.index} · {spec.label}
        </span>
        <span aria-hidden className={`status-dot ${spec.accent}`} />
      </div>
      {loading || spec.value === null ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
            {spec.value}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{spec.hint}</span>
        {spec.trend && spec.trend.length > 1 && !loading && (
          <Sparkline data={spec.trend} />
        )}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const w = 72;
  const h = 18;
  const step = w / (data.length - 1 || 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="text-primary/60"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function ChartBody({ data }: { data: DailyPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const first = data[0];
  const last = data[data.length - 1];
  const mid = data[Math.floor(data.length / 2)];

  // Y-axis ticks: 0, ~half, max
  const halfTick = Math.round(max / 2);
  const ticks = [max, halfTick, 0];

  return (
    <div>
      <div className="flex gap-4">
        <div className="flex h-56 w-8 flex-col justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="text-right">
              {t}
            </span>
          ))}
        </div>
        <div
          className="relative flex h-56 flex-1 items-end gap-1.5 border-b border-l hairline pl-1"
          role="img"
          aria-label={`Bar chart of tickets per day for the last 30 days, peaking at ${max}`}
        >
          {/* horizontal guide lines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col justify-between"
          >
            {ticks.map((_, i) => (
              <div
                key={i}
                className={
                  "border-t " +
                  (i === ticks.length - 1
                    ? "border-transparent"
                    : "border-dashed border-foreground/8")
                }
              />
            ))}
          </div>
          {data.map((d, i) => {
            const heightPct = (d.count / max) * 100;
            const isLast = i === data.length - 1;
            return (
              <div
                key={d.date}
                className="group/bar relative flex h-full flex-1 items-end"
                title={`${formatShortDate(d.date)}: ${d.count} ticket${d.count === 1 ? "" : "s"}`}
              >
                <div
                  className={
                    "relative w-full rounded-t-full transition-all duration-300 " +
                    (isLast
                      ? "bg-signal group-hover/bar:bg-signal"
                      : "bg-primary/50 group-hover/bar:bg-primary")
                  }
                  style={{
                    height: `${heightPct}%`,
                    minHeight: d.count > 0 ? "2px" : "0",
                  }}
                />
                {/* hover tooltip */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-1 scale-95 whitespace-nowrap rounded-full border hairline bg-surface px-2.5 py-1 font-mono text-[10px] tracking-wide opacity-0 shadow-bubble transition-all group-hover/bar:translate-y-0 group-hover/bar:scale-100 group-hover/bar:opacity-100"
                >
                  <span className="text-muted-foreground">
                    {formatShortDate(d.date)}
                  </span>
                  <span className="ml-1.5 font-semibold tabular-nums">
                    {d.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 ml-12 flex justify-between font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
        <span>{first ? formatShortDate(first.date) : ""}</span>
        <span>{mid ? formatShortDate(mid.date) : ""}</span>
        <span>{last ? formatShortDate(last.date) : ""}</span>
      </div>
    </div>
  );
}
