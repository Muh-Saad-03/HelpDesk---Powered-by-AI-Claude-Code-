# Helpdesk

AI-powered ticket management system. See `project-scope.md` for product scope and `implementation-plan.md` for phased roadmap.

## Stack

- **Runtime / package manager**: Bun (workspaces) — not Node, despite what `tech-stack.md` says.
- **Frontend** (`/client`): React 19 + TypeScript, Vite 7 (dev server on :5173), Tailwind v4, shadcn/ui 3.x (`base-nova` preset, `neutral` baseColor, lucide icons), react-router-dom 7, react-hook-form + zod for forms.
- **Backend** (`/server`): Express 5 + TypeScript on Bun, listens on :3001 (run via `bun --watch src/index.ts`). ESM only. CORS allows the Vite origin with credentials.
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
client/   React + TS + Vite — dev server on :5173, proxies /api/* to :3001
server/   Express + TS on Bun — listens on :3001
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
```

## Key conventions

- **Use Context7 MCP server to fetch up-to-date documentation for libraries** (see section below).
- **Runtime**: Bun, not Node — use `bun` / `bunx`, not `npm` / `npx` / `node`.
- **Modules**: ESM only (`"type": "module"`). Use `import` / `export`, not `require`.
- **Server**: Express 5 typed handlers; annotate `Request`, `Response`, `NextFunction` with `type` imports.
- **Client → server calls**: use relative paths (`/api/...`) so Vite's dev proxy handles them; never hardcode `http://localhost:3001`.
- **TypeScript**: strict mode everywhere. Prefer `type` imports for types-only symbols.
- **New endpoints**: prefix with `/api/`, return JSON, surface errors through Express's error middleware (4-arg signature) — don't swallow them in handlers.
- **Env vars**: read via `process.env.X` with a sensible default; document in `server/.env.example`.
- **No new files unless needed**: edit existing files in place; don't add docs (`*.md`) unless asked.

## Documentation lookups — use Context7

When you need API syntax, configuration, version-specific behavior, or setup instructions for any library, framework, SDK, CLI, or cloud service, use the **Context7 MCP server** rather than guessing or relying on training data. This applies even to well-known libraries (React, Express, Vite, Bun, Prisma, etc.) because their APIs change.

Workflow:
1. `mcp__context7__resolve-library-id` with the library name and a query describing what you need.
2. `mcp__context7__query-docs` with the resolved ID and a specific question.
3. If the first answer is insufficient, retry with `researchMode: true`.

Skip Context7 only for: refactoring, debugging business logic, code review, or general programming concepts.
