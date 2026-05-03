---
name: Storage state pattern
description: How per-role auth cookies are persisted and loaded in Playwright tests
type: project
---

Auth storage state files:
- `playwright/.auth/admin.json` — ADMIN session cookies
- `playwright/.auth/agent.json` — AGENT session cookies

Both files are in `.gitignore` and must NOT be committed.

`e2e/auth.setup.ts` drives the real login form for each role, waits for the redirect to `/` and the `Welcome` heading, then calls `page.context().storageState({ path: ... })`.

Path constants are exported from `playwright.config.ts` as `ADMIN_STORAGE_STATE` and `AGENT_STORAGE_STATE` (using `path.resolve(__dirname, ...)` — CJS-safe).

The `admin` and `agent` Playwright projects set `storageState: ADMIN/AGENT_STORAGE_STATE` and list `"setup"` in `dependencies`, so every test in those projects starts with a valid pre-baked session cookie — no login step needed.

Login-form tests (in `chromium` project) run with NO storage state so they test the real unauthenticated UX.
