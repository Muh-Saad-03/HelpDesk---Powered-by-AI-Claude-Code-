# Helpdesk

AI-powered ticket management system. See `project-scope.md` for product scope and `implementation-plan.md` for phased roadmap.

## Stack

- **Runtime / package manager**: Bun (workspaces) — not Node, despite what `tech-stack.md` says.
- **Frontend** (`/client`): React 19 + TypeScript, Vite 7 (dev server on :5173), Tailwind v4, shadcn/ui 3.x (`base-nova` preset, `neutral` baseColor, lucide icons), react-router-dom 7, react-hook-form + zod for forms, **axios** for HTTP, **TanStack Query** (`@tanstack/react-query`) for server state.
- **Backend** (`/server`): Express 5 + TypeScript on Bun, listens on :3001 (run via `bun --watch src/index.ts`). ESM only. CORS allows the Vite origin with credentials. **zod** for request body validation.
- **Database**: PostgreSQL 18 (local), Prisma 7 ORM (`prisma-client` provider + `@prisma/adapter-pg`).
- **Auth**: Better Auth 1.6 — server (`server/src/auth.ts`) + `better-auth/react` on the client (`client/src/lib/auth-client.ts`). Email/password only, signup disabled, sessions stored in Postgres. See **Authentication** section below.
- **AI**: Claude API — _planned, not yet wired_. No `@anthropic-ai/sdk` dependency yet.
- **Email**: SendGrid/Mailgun — _planned, not yet wired_.

## Database

- Connection string in `server/.env` as `DATABASE_URL` (gitignored). Example in `server/.env.example`.
- Schema at `server/prisma/schema.prisma`; generated client at `server/src/generated/prisma` (gitignored).
- Prisma CLI is configured via `server/prisma.config.ts` (loads `DATABASE_URL` via `dotenv/config`).
- After schema changes, run from `/server`:
  - `bun run db:migrate` — create + apply a new migration
  - `bun run db:generate` — regenerate the client
  - `bun run db:studio` — open Prisma Studio

## Authentication

- **Library**: [Better Auth](https://better-auth.com) on both server and client.
- **Server config**: `server/src/auth.ts` — Prisma adapter (`postgresql`), email/password only, `disableSignUp: true` (users are created by seed/admin, not self-service), no email verification.
- **Roles**: `Role` enum in `schema.prisma` is `ADMIN` | `AGENT`. New users default to `AGENT`. Role is declared as a Better Auth `additionalField` with `input: false`, so it is **never** writable through the auth API — set it directly in the DB or via Prisma in trusted server code.
- **Mount order** (`server/src/index.ts`): `app.all("/api/auth/*splat", toNodeHandler(auth))` **must** be mounted before `express.json()`. Better Auth needs the raw body — moving it after `express.json()` breaks signups/sessions silently.
- **CORS**: `cors({ origin: "http://localhost:5173", credentials: true })`. Browser requests must send cookies; the client uses Better Auth's React hooks which handle this automatically.
- **Trusted origins**: comma-separated list in `TRUSTED_ORIGINS` (defaults to `http://localhost:5173`).
- **Client**: `client/src/lib/auth-client.ts` exports `authClient`, `signIn`, `signOut`, `useSession`. Use `useSession()` for reactive session state, and wrap protected routes with `<RequireAuth>` (`client/src/components/RequireAuth.tsx`). Login flow lives in `client/src/pages/LoginPage.tsx`.
- **Schema models**: `User`, `Session`, `Account`, `Verification` in `schema.prisma` — all generated/managed for Better Auth. Don't rename their `@@map` table names.
- **Seeding the first admin**: from `/server`, set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in `.env`, then run `bun run db:seed`. The script promotes an existing user to `ADMIN` if found, or creates one with a hashed password via `auth.$context.password.hash`.
- **Required env vars** (in `server/.env`): `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`), `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, plus `ADMIN_*` for seeding. See `server/.env.example`.

## Layout

```
core/     Bun workspace — shared TS code consumed by both client and server (zod schemas, shared types)
client/   React + TS + Vite — dev server on :5173, proxies /api/* to :3001
server/   Express + TS on Bun — listens on :3001
e2e/      Playwright tests + global setup; root-level (not a workspace)
```

## Commands

```bash
bun install            # install all workspace deps
bun run dev            # run client + server in parallel
bun run dev:server     # server only (http://localhost:3001)
bun run dev:client     # client only (http://localhost:5173)
bun run build          # build both packages
bun --filter server typecheck
bun --filter client typecheck
bun --filter client test           # component tests (single run)
bun --filter client test:watch     # component tests in watch mode (for writing)
```

## Key conventions

- **Use Context7 MCP server to fetch up-to-date documentation for libraries** (see section below).
- **Runtime**: Bun, not Node — use `bun` / `bunx`, not `npm` / `npx` / `node`.
- **Modules**: ESM only (`"type": "module"`). Use `import` / `export`, not `require`.
- **Server**: Express 5 typed handlers; annotate `Request`, `Response`, `NextFunction` with `type` imports.
- **Client → server calls**: use relative paths (`/api/...`) so Vite's dev proxy handles them; never hardcode `http://localhost:3001`. Use **axios** for the request and wrap reads in **TanStack Query** (`useQuery` / `useMutation`) — don't reach for raw `fetch` or hand-rolled `useEffect` + `useState` data plumbing. Pass the `signal` from the `queryFn` argument into axios so cancellation works on unmount. The `QueryClientProvider` is already mounted in `client/src/main.tsx`.
- **TypeScript**: strict mode everywhere. Prefer `type` imports for types-only symbols.
- **New endpoints**: prefix with `/api/`, return JSON, surface errors through Express's error middleware (4-arg signature) — don't swallow them in handlers.
- **No try/catch in async handlers**: Express 5 auto-forwards rejected promises to the error middleware, so async handlers should let exceptions bubble. Don't wrap handler bodies in `try { ... } catch (err) { next(err) }` — it's pure noise. Only catch when you genuinely need to recover or transform the error.
- **Request validation**: validate every request body / query / params with **zod** (`safeParse`). On failure, respond `400` with the first issue's message — don't hand-roll `typeof` checks. Define the schema near the handler (or shared if reused) so the inferred type drives the handler logic.
- **Client forms**: build every form with **react-hook-form + zod** (`zodResolver` from `@hookform/resolvers/zod`). Wrap each input in `<Controller>` rendering shadcn `Field` + `FieldLabel` + `FieldError` — no raw `useState` per input, no shadcn `Form` component. See `LoginPage.tsx` and `CreateUserDialog.tsx` for the canonical pattern.
- **Shared zod schemas live in `core/`**: any zod schema used by both the client form and the matching server endpoint must be defined once in the `core` workspace (`core/src/schemas/<resource>.ts`) and imported as `import { fooSchema } from "core"` from both sides. Don't duplicate the schema — duplicates drift, error messages diverge, and the form/server contract silently breaks. The `core` package is a Bun workspace listed alongside `client` and `server` and exports plain TS via its `exports` field; both consumers depend on it as `"core": "workspace:*"`. Example: `createUserSchema` in `core/src/schemas/user.ts` is consumed by `client/src/components/CreateUserDialog.tsx` and `server/src/routes/users.ts`.
- **Env vars**: read via `process.env.X` with a sensible default; document in `server/.env.example`.
- **No new files unless needed**: edit existing files in place; don't add docs (`*.md`) unless asked.

## Testing

There are **two** test surfaces in this repo. Pick the right one for the task — don't write component tests in `e2e/` or e2e tests under `client/src/`.

### Component tests (Vitest + React Testing Library)

For testing a single React component or page in isolation: rendered output, role/text queries, mocked hooks, mocked HTTP.

- **Stack**: Vitest 4 + jsdom + `@testing-library/react` 16 + `@testing-library/jest-dom` matchers + `@testing-library/user-event`. Configured via the `test` block in `client/vite.config.ts`.
- **Setup file**: `client/src/test/setup.ts` — loads jest-dom matchers and runs `cleanup()` after each test. Don't duplicate this in individual specs.
- **Location**: colocate as `*.test.tsx` next to the component (e.g. `client/src/pages/UsersPage.test.tsx`).
- **Render helper**: use `renderWithQuery` from `client/src/test/renderWithQuery.tsx` to wrap UI in a fresh `QueryClient` (with `retry: false` so failure-path tests don't retry 3×). Compose with `<MemoryRouter>` at the call site if the component uses react-router.
- **Mocking patterns**:
  - HTTP: `vi.mock("axios")` then `vi.mocked(axios, true).get.mockResolvedValueOnce(...)`. Cover loading, success, empty, and error paths.
  - Auth/session: `vi.mock("@/lib/auth-client", () => ({ ... }))` with a fake `useSession` returning the role you need — required when rendering anything that includes `<NavBar>`.
- **Run**: `bun --filter client test` (single run, CI-safe) or `bun --filter client test:watch` (watch mode while writing).
- Component tests are fine to author directly — no subagent needed.

### End-to-end tests — use `playwright-e2e-author`

When the user asks to write, scaffold, or extend Playwright end-to-end tests (new specs, regression tests for bug fixes, page object models, auth/role flow coverage, etc.), delegate to the **`playwright-e2e-author`** subagent via the Agent tool. That agent owns the operational details of the test environment (test DB, env loading, global setup/seed, storage state for auth) and is configured to extend the existing setup rather than rebuild it.

Skip the subagent only for trivial one-line edits to an existing test file.

## Documentation lookups — use Context7

When you need API syntax, configuration, version-specific behavior, or setup instructions for any library, framework, SDK, CLI, or cloud service, use the **Context7 MCP server** rather than guessing or relying on training data. This applies even to well-known libraries (React, Express, Vite, Bun, Prisma, etc.) because their APIs change.

Workflow:
1. `mcp__context7__resolve-library-id` with the library name and a query describing what you need.
2. `mcp__context7__query-docs` with the resolved ID and a specific question.
3. If the first answer is insufficient, retry with `researchMode: true`.

Skip Context7 only for: refactoring, debugging business logic, code review, or general programming concepts.
