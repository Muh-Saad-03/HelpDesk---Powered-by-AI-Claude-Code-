# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────────────
# Helpdesk — single-service Railway image.
# Stages:
#   1. deps    — install workspace deps + generate Prisma client (postinstall)
#   2. build   — build the React/Vite client → /app/client/dist
#   3. runtime — minimal layer that runs migrations + the Express server
# ──────────────────────────────────────────────────────────────────────────────

FROM oven/bun:1.3-alpine AS deps
WORKDIR /app

# Copy only the manifests + Prisma schema needed for `bun install`. The
# server's postinstall hook runs `prisma generate`, which needs the schema
# in place. Prisma 7's config eagerly resolves DATABASE_URL on load, so we
# pass a dummy value here — generate doesn't open a connection, and the
# runtime DATABASE_URL is supplied by Railway.
COPY package.json bun.lock ./
COPY core/package.json ./core/
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/prisma.config.ts

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN bun install --frozen-lockfile

# ─── build ───────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS build
WORKDIR /app

COPY --from=deps /app /app
COPY . .

# Re-run `prisma generate` against the fresh schema in case anything moved
# between the manifests-only copy above and the full source copy. Same
# placeholder DATABASE_URL trick as the deps stage.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN cd server && bunx prisma generate

# Build the SPA — output lands at /app/client/dist
RUN bun --filter client build

# ─── runtime ─────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Railway injects PORT at runtime; this is the in-container default for
# `docker run` outside Railway. The server reads `process.env.PORT`.
ENV PORT=3001

COPY --from=build /app /app

WORKDIR /app/server
EXPOSE 3001

# `prisma migrate deploy` is idempotent and safe to run on every boot. It
# applies any pending migrations and exits cleanly when there are none.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/index.ts"]
