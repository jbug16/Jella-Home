# Jella Home

A private household web app for budgets, meals, shopping, recipes,
subscriptions, and a shared calendar. It replaces the difficult parts of an
existing Google Sheets workbook with a clearer, responsive interface.

This repository is at **Milestone 1: Project foundation** — the app shell,
tooling, and architecture are in place; product features are not built yet.

## Tech stack

- Next.js (App Router) with React Server Components
- TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (Radix)
- Zod for validation
- Vitest (unit) and Playwright (end-to-end)

## Prerequisites

- Node.js 24 (see [`.nvmrc`](.nvmrc); run `nvm use`)
- npm

## Setup

```bash
nvm use            # selects Node 24
npm ci             # install dependencies from the lockfile
```

Copy the environment template and fill in values as later milestones need them
(none are required to run the foundation shell):

```bash
cp .env.example .env.local
```

## Development

```bash
npm run dev        # start the dev server at http://localhost:3000
```

The root route redirects to `/dashboard`. All seven sections render a
placeholder "coming soon" state in this milestone.

## Environment variables

Environment parsing is split so it can be tested and kept server-side:

- [`lib/config/env-schema.ts`](lib/config/env-schema.ts) — pure Zod schema and
  parser (no secrets, no server-only imports), covered by unit tests.
- [`lib/env.ts`](lib/env.ts) — `server-only` wrapper that reads `process.env`
  lazily on first access, so a secret-less build never fails.

See [`.env.example`](.env.example) for the documented variables. Store local
spreadsheets, exports, and credential files under `private-data/` or use the
`*service-account*.json` / `*credentials*.json` patterns — all are Git-ignored.

## Verification

Run the full gate before considering work complete:

```bash
npm run verify
```

`verify` runs, in order: `format:check`, `lint`, `typecheck`, `test` (Vitest),
`build` (`next build`), and `test:e2e` (Playwright against the production build).

Individual commands:

```bash
npm run format:check   # Prettier, no writes
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest unit tests
npm run build          # next build
npm run start          # serve the production build
npm run test:e2e       # Playwright smoke suite (requires a prior build)
```

Playwright browsers are required once per machine/CI:

```bash
npx playwright install --with-deps chromium webkit
```

The e2e suite runs a Chromium smoke at desktop (1280) and 360px, plus a WebKit
smoke on iPhone and iPad viewports (the real target devices use Safari).

## Project structure

```
app/                      # App Router
  (app)/                  # authenticated shell group (sidebar + mobile nav)
    <domain>/page.tsx     # dashboard, budget, meals, shopping, recipes, ...
    loading.tsx           # shared loading boundary
    error.tsx             # shared error boundary
components/
  layout/                 # sidebar, mobile nav, header, nav config
  common/                 # PageHeader, EmptyState
  ui/                     # shadcn/ui primitives
lib/
  config/                 # env-schema, sheet mappings
  env.ts                  # server-only env access
  google-sheets/          # low-level Sheets access (stub, M3)
  repositories/           # typed domain operations (stub, M3)
  domain/                 # domain schemas/types (stub)
tests/
  unit/                   # Vitest
  e2e/                    # Playwright
private-data/             # local spreadsheets/exports (Git-ignored)
```

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the roadmap and decisions, and
[`AGENTS.md`](AGENTS.md) / [`ROLES.md`](ROLES.md) for project conventions.
