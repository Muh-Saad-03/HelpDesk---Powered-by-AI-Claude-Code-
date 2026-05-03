# Helpdesk

Full-stack monorepo: Express + React + TypeScript on Bun.

## Layout

```
.
├── client/   # React + TypeScript (Vite)
└── server/   # Express + TypeScript (Bun runtime)
```

## Prerequisites

- [Bun](https://bun.sh) >= 1.3

## Install

```bash
bun install
```

## Develop

Run both apps in parallel:

```bash
bun run dev
```

Or individually:

```bash
bun run dev:server   # http://localhost:3001
bun run dev:client   # http://localhost:5173
```

The Vite dev server proxies `/api/*` to the Express server.

## Build

```bash
bun run build
```
