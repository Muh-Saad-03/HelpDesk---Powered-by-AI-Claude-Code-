import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "../components/NavBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Parse YYYY-MM-DD as a local date (the server bucketed in local time too).
// Using `new Date("2026-05-05")` would interpret it as UTC midnight, which
// can shift the label across the day-boundary in negative-offset zones.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function formatShortDate(iso: string): string {
  return monthDayFormatter.format(parseLocalDate(iso));
}

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

  const cards: { label: string; value: string | null }[] = [
    {
      label: "Total tickets",
      value: data ? data.total.toLocaleString() : null,
    },
    {
      label: "Open tickets",
      value: data ? data.open.toLocaleString() : null,
    },
    {
      label: "Resolved by AI",
      value: data ? data.aiResolved.toLocaleString() : null,
    },
    {
      label: "% resolved by AI",
      value: data ? formatPct(data.aiResolvedPct) : null,
    },
    {
      label: "Avg resolution time",
      value: data ? formatDuration(data.avgResolutionMs) : null,
    },
  ];

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl p-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load stats: {error.message}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cards.map((c) => (
                <MetricCard
                  key={c.label}
                  label={c.label}
                  value={c.value}
                  loading={isPending}
                />
              ))}
            </div>
            <TicketsPerDayChart data={data?.daily} loading={isPending} />
          </>
        )}
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading || value === null ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function TicketsPerDayChart({
  data,
  loading,
}: {
  data: DailyPoint[] | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets per day (last 30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ChartBody data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function ChartBody({ data }: { data: DailyPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const first = data[0];
  const last = data[data.length - 1];
  const mid = data[Math.floor(data.length / 2)];

  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-48 flex-col justify-between text-xs tabular-nums text-muted-foreground">
          <span>{max}</span>
          <span>0</span>
        </div>
        <div
          className="flex h-48 flex-1 items-end gap-1 border-b border-l border-border/60 pl-1"
          role="img"
          aria-label={`Bar chart of tickets per day for the last 30 days, peaking at ${max}`}
        >
          {data.map((d) => {
            const heightPct = (d.count / max) * 100;
            return (
              <div
                key={d.date}
                className="group relative flex h-full flex-1 items-end"
                title={`${formatShortDate(d.date)}: ${d.count} ticket${d.count === 1 ? "" : "s"}`}
              >
                <div
                  className="w-full rounded-t bg-foreground/70 transition-colors group-hover:bg-foreground"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: d.count > 0 ? "2px" : "0",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 ml-8 flex justify-between text-xs text-muted-foreground">
        <span>{first ? formatShortDate(first.date) : ""}</span>
        <span>{mid ? formatShortDate(mid.date) : ""}</span>
        <span>{last ? formatShortDate(last.date) : ""}</span>
      </div>
    </div>
  );
}
