---
name: Playwright config + project structure
description: How playwright.config.ts is structured — 4 projects, webServer blocks, storage state exports
type: project
---

Config lives at `/Users/muhammadsaad/Desktop/helpdesk/playwright.config.ts`.

4 projects:
- `setup` — matches `auth.setup.ts`, runs the real login flow and writes storage state for both roles
- `chromium` — unauthenticated tests (login form, guards, signup-disabled); ignores auth.setup, admin-session, agent-session
- `admin` — matches `admin-session*.spec.ts`, loads `playwright/.auth/admin.json`, depends on `setup`
- `agent` — matches `agent-session*.spec.ts`, loads `playwright/.auth/agent.json`, depends on `setup`

Exports `ADMIN_STORAGE_STATE` and `AGENT_STORAGE_STATE` path constants (used by auth.setup.ts).

webServer: runs `bun --filter server dev` and `bun --filter client dev` with `NODE_ENV=test`. Bun auto-loads `server/.env.test` when `NODE_ENV=test`. `reuseExistingServer: !process.env.CI` so local dev reuses running servers.

workers: 1 (keeps cookie/DB state deterministic).

**Why:** Multiple role-scoped projects let each spec file start with the right pre-baked auth cookie without repeating the login flow. The `setup` dependency ensures auth.setup always runs first.
