// Must come first so Sentry installs its global error handlers before
// any other module gets a chance to throw.
import { Sentry } from "./sentry";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="p-8">
          <h1 className="mb-2 text-xl font-semibold">Something went wrong.</h1>
          <p className="text-muted-foreground">
            The error has been reported. Try reloading the page.
          </p>
        </div>
      }
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
