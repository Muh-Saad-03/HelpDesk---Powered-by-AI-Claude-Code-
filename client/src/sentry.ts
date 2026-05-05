// Sentry init — imported first from main.tsx. No-op when VITE_SENTRY_DSN
// is unset, so dev runs don't send events to a real project. Errors only;
// performance + replay are off to stay inside the free tier quota.
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
  });
}

export { Sentry };
