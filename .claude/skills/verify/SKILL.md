---
name: verify
description: Build/launch/drive recipe for verifying helpdesk changes end-to-end (dev servers, admin login, driving the UI with Playwright).
---

# Verifying helpdesk changes

## Launch

```bash
bun run dev   # from repo root, background it — client :5173 + server :3001
curl -s http://localhost:3001/api/health   # ready when {"status":"ok"}
```

Requires `server/.env` with `DATABASE_URL`, `OPENAI_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (all present locally).

## Authenticated API calls

```bash
PW=$(grep '^ADMIN_PASSWORD=' server/.env | cut -d'"' -f2)
curl -s -c /tmp/cookies.txt -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" -H "Origin: http://localhost:5173" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"$PW\"}"
# then: curl -b /tmp/cookies.txt ... (include the Origin header on POSTs)
```

`/api/chat` streams SSE — use `curl -sN` and post a UIMessage body:
`{"messages":[{"id":"m1","role":"user","parts":[{"type":"text","text":"..."}]}]}`.

## Driving the UI (Playwright script, no test runner)

- `bun run test:e2e:install` once if chromium is missing.
- Write a standalone script importing `{ chromium } from "@playwright/test"` and
  **run it from the repo root with a filename inside the repo** (e.g. copy to
  `./drive.tmp.ts`, `bun ./drive.tmp.ts`, delete after) — running a script from
  outside the repo makes bun auto-install a mismatched playwright-core from its
  global cache instead of using the repo's pinned 1.59.x.
- Login flow: goto `/login`, fill labels /email/i + /password/i, click /sign in/i,
  wait for URL `/`.

## Gotchas

- To wait for a chat stream to finish in Playwright: pre-fill the input with the NEXT message,
  then wait for the Send button to enable — Send is disabled both while streaming AND when the
  input is empty, so waiting on it with an empty input hangs forever.

- The assistant's markdown answers contain `<ul>/<li>`, so `getByRole("list"/"listitem")`
  inside the chat panel is ambiguous — scope widget-row clicks with `dialog.locator("li button")`.
- `animate-bubble-in` is for **centered** dialogs (ends at translate(-50%,-50%), fill-mode both);
  bottom-anchored floating panels must use `animate-rise`.
