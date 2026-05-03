---
name: Test users and seeding
description: Test DB users and how they get seeded — credentials constants in e2e/test-users.ts
type: project
---

Test DB: `helpdesk_test` (separate from the dev `helpdesk` DB).
Config: `server/.env.test` (gitignored).

Two seeded users:
- ADMIN: `admin@test.local` / `test-admin-password` — seeded from `ADMIN_*` vars in `server/.env.test`
- AGENT: `agent@test.local` / `test-agent-password` — hard-coded in `server/src/seed.ts` under `if (process.env.NODE_ENV === "test")` branch

Credentials constants live in `e2e/test-users.ts` as `ADMIN_USER` and `AGENT_USER`.

Seeding is idempotent (`upsertUser` pattern: finds existing, promotes role if needed, else creates fresh).
`globalSetup` runs `db:migrate:test` then `db:seed:test` before every test run.

**Why the test agent is hard-coded (not env-driven):** The e2e fixtures need deterministic credentials without extra `.env` wiring. The seed branch is TEST-only, so dev seeds are not affected.
