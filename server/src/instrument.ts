/** @format */

// Sentry MUST be initialized before any other import that needs to be
// auto-instrumented (Express, http, etc.) — that's why this file is
// imported first from index.ts. Skipped silently when SENTRY_DSN is unset
// so dev runs don't ship spurious events to a real project.
import * as Sentry from "@sentry/bun";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
	Sentry.init({
		dsn,
		environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
		// Errors only by default. Add `tracesSampleRate` here to enable
		// performance tracing — leaves it disabled to keep the free tier
		// quota for actual errors.
	});
}
