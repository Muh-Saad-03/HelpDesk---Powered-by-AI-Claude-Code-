import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";

// Wraps `ui` in a fresh QueryClientProvider so each test gets its own cache.
// retry:false keeps failure-path tests fast — the production client retries 3x
// by default, which would multiply error-state tests' duration unnecessarily.
export function renderWithQuery(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options,
  );
  return { ...result, queryClient };
}
