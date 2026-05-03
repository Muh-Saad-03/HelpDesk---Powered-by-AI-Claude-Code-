# Helpdesk

AI-powered ticket management system. See `project-scope.md` for product scope and `implementation-plan.md` for phased roadmap.

## Stack

- **Runtime / package manager**: Bun (workspaces)
- **Server** (`/server`): Express 5 + TypeScript, run directly via `bun --watch src/index.ts`
- **Client** (`/client`): React 19 + TypeScript + Vite 7
- **Database**: PostgreSQL 18 (local), Prisma 7 ORM (`prisma-client` provider + `@prisma/adapter-pg`)
- Planned (not yet wired): Claude API, SendGrid/Mailgun

Note: `tech-stack.md` lists Node.js, but the project actually runs on Bun.

## Database

- Connection string in `server/.env` as `DATABASE_URL` (gitignored). Example in `server/.env.example`.
- Schema at `server/prisma/schema.prisma`; generated client at `server/src/generated/prisma` (gitignored).
- Prisma CLI is configured via `server/prisma.config.ts` (loads `DATABASE_URL` via `dotenv/config`).
- After schema changes, run from `/server`:
  - `bun run db:migrate` — create + apply a new migration
  - `bun run db:generate` — regenerate the client
  - `bun run db:studio` — open Prisma Studio

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
