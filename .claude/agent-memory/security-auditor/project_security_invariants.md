---
name: Security Invariants
description: Critical security invariants and trust boundaries established in the helpdesk codebase
type: project
---

Key security invariants verified in initial audit (2026-05-03):

1. `role` field in `server/src/auth.ts` is declared with `input: false` — never writable through the auth API. Must not be changed.
2. `app.all("/api/auth/*splat", toNodeHandler(auth))` is mounted BEFORE `express.json()` in `server/src/index.ts` (line 19 before line 21). Correct — do not reorder.
3. `disableSignUp: true` is set in `auth.ts` — no self-service registration.
4. Passwords hashed via `auth.$context.password.hash` in `seed.ts` — correct pattern.
5. `TRUSTED_ORIGINS` feeds into Better Auth's `trustedOrigins`; CORS in `index.ts` is separately hardcoded to `http://localhost:5173` (a divergence — see known gap below).

Known gaps recorded from first audit:
- CORS in `index.ts:16` is hardcoded to `http://localhost:5173` and does not respect `TRUSTED_ORIGINS`. Better Auth's own CORS (via `trustedOrigins`) is correct, but Express-level CORS will lag behind if origins change.
- Error handler at `index.ts:42` leaks `err.message` to clients in all environments — needs NODE_ENV guard.
- `.env.example` contains a weak example `BETTER_AUTH_SECRET` ("12345") and weak `ADMIN_PASSWORD` ("password123") — flag if these values appear in actual `.env`.
- No server-side authorization middleware exists yet. All `/users` page protection is client-side only — acceptable now (no API endpoint), critical gap the moment `/api/users` is added.
- `client/src/lib/auth-client.ts` uses `import type { auth }` from server — type-only, safe, but only guaranteed by `import type` keyword and Vite's build behavior.
- `requireEmailVerification: false` — intentional (no email provider yet), but means account takeover via password reset is possible if email provider is added without re-enabling this.

**Why:** These invariants protect against privilege escalation, auth bypass, and data exposure — the primary threat vectors in a helpdesk app where AGENT users exist alongside ADMIN users.

**How to apply:** In future reviews, verify each of these invariants is still intact before looking for new issues. Flag any change to auth.ts role field, index.ts mount order, or disableSignUp immediately as Critical.
