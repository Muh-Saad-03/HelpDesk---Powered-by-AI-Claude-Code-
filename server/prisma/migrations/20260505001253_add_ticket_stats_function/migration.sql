-- Aggregate dashboard stats: ticket totals, AI-resolved counts, average
-- resolution time, and the trailing 30-day daily-count series — returned
-- as a single jsonb document so the API handler can pass it straight
-- through. STABLE because the result depends only on the database state at
-- statement start, with no side effects.
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH base AS (
    SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'OPEN') AS open_count,
        -- AI-resolved = terminal-state ticket with at least one
        -- system-authored reply (senderType=AGENT, authorId=null) — the
        -- marker the auto-resolve worker writes for AI replies.
        COUNT(*) FILTER (
            WHERE status IN ('RESOLVED', 'CLOSED')
              AND EXISTS (
                  SELECT 1 FROM "Reply" r
                  WHERE r."ticketId" = t.id
                    AND r."authorId" IS NULL
                    AND r."senderType" = 'AGENT'
              )
        ) AS ai_resolved,
        -- Approximation: (updatedAt - createdAt) for resolved tickets.
        -- updatedAt advances on subsequent edits (re-categorize, reassign),
        -- so this drifts upward if a resolved ticket is later touched.
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)
            FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) AS avg_resolution_ms
    FROM "Ticket" t
),
-- 30-day window in the database session timezone, anchored at midnight
-- today. generate_series produces every day so the chart never has gaps.
window_days AS (
    SELECT generate_series(
        current_date - INTERVAL '29 days',
        current_date,
        INTERVAL '1 day'
    )::date AS day
),
ticket_days AS (
    SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*) AS count
    FROM "Ticket"
    WHERE "createdAt" >= current_date - INTERVAL '29 days'
    GROUP BY 1
),
daily AS (
    SELECT
        TO_CHAR(w.day, 'YYYY-MM-DD') AS date,
        COALESCE(td.count, 0)::int AS count,
        w.day
    FROM window_days w
    LEFT JOIN ticket_days td ON td.day = w.day
)
SELECT jsonb_build_object(
    'total', (SELECT total FROM base),
    'open', (SELECT open_count FROM base),
    'aiResolved', (SELECT ai_resolved FROM base),
    'aiResolvedPct', CASE
        WHEN (SELECT total FROM base) = 0 THEN NULL
        ELSE ((SELECT ai_resolved FROM base)::numeric
              / (SELECT total FROM base)) * 100
    END,
    'avgResolutionMs', (SELECT avg_resolution_ms FROM base),
    'daily', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('date', date, 'count', count) ORDER BY day)
         FROM daily),
        '[]'::jsonb
    )
);
$$;
