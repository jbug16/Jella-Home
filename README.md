# Jella Home

A private household web app for budgets, meals, shopping, recipes,
subscriptions, and a shared calendar.

**Current checkpoint:** Milestone 1 (app shell) and Milestone 2 (Supabase Auth +
Postgres + RLS) are complete. Product feature UI is not built yet.

- Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Hosted runbook: [`docs/HOSTED_SUPABASE.md`](docs/HOSTED_SUPABASE.md)
- Roadmap / decisions: [`IMPLEMENTATION.md`](IMPLEMENTATION.md)

## Tech stack

- Next.js App Router (React Server Components)
- TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui
- Zod
- Supabase Auth (email/password) + Postgres
- Vitest, Playwright, pgTAP

## Prerequisites

- Node.js 24 (`nvm use` — see [`.nvmrc`](.nvmrc))
- npm
- Docker runtime for local Supabase (Colima + Docker CLI on this project)
- Playwright browsers (once per machine):  
  `npx playwright install --with-deps chromium webkit`

## Quick start (local)

```bash
# 1. Clone and install
git clone <repo-url> Jella-Home
cd Jella-Home
nvm use
npm ci

# 2. Environment template
cp .env.example .env.local

# 3. Start Docker runtime + local Supabase
colima start                 # skip if Docker Desktop / another runtime is up
npm run supabase:start
npx supabase status -o env
```

Copy values into `.env.local` (never commit that file):

| `supabase status` field              | App env var                            |
| ------------------------------------ | -------------------------------------- |
| API URL                              | `NEXT_PUBLIC_SUPABASE_URL`             |
| PUBLISHABLE_KEY (or legacy ANON_KEY) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| SECRET_KEY (or legacy SERVICE_ROLE)  | `SUPABASE_SECRET_KEY`                  |

```bash
# 4. Apply migrations + fake seed, run RLS tests
npm run supabase:reset
npm run test:db

# 5. Run the app
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). You should be redirected to
`/sign-in`.

Local seed users (fake only, from `supabase/seed.sql`):

| Email                   | Password             |
| ----------------------- | -------------------- |
| `member-a@example.test` | `local-dev-password` |
| `member-b@example.test` | `local-dev-password` |

Public sign-up is disabled. There is no sign-up page. Local analytics is off in
`supabase/config.toml` for Colima compatibility.

## Hosted Supabase

See [`docs/HOSTED_SUPABASE.md`](docs/HOSTED_SUPABASE.md). Summary: create a
project, disable public email sign-up, `supabase link` + `db push`, put hosted
keys in `.env.local`, then `npm run provision:household`.

## Scripts

```bash
npm run dev                  # development server
npm run build && npm start   # production build
npm run verify               # format, lint, typecheck, unit, e2e (e2e rebuilds for local Supabase)
npm run test                 # Vitest unit tests
npm run test:e2e             # Playwright (needs browsers installed)
npm run test:db              # pgTAP RLS (needs local Supabase)
npm run supabase:start       # local stack
npm run supabase:reset       # recreate DB from migrations + seed
npm run provision:household  # hosted/bootstrap household (secret key)
npm run provision:add-member
npm run verify:hosted-access
npm run supabase:advisors    # linked hosted project
```

## Project structure

```
app/
  (app)/                  # membership-gated shell; Budget UI at /budget
  sign-in/                # email/password only
  not-provisioned/
  auth/actions.ts
components/
  budget/                 # month nav, summaries, transaction forms
lib/
  supabase/               # SSR, browser (auth-only), admin (secret)
  repositories/           # cookie-backed domain API (household + budget)
  domain/                 # Zod schemas + derived budget math
supabase/
  migrations/
  seed.sql                # fake local users + sample budget rows
  tests/                  # pgTAP
scripts/                  # provision, e2e local runner, hosted verification
docs/HOSTED_SUPABASE.md
docs/WORKBOOK_MAPPING.md  # legacy XLSX → schema (import deferred)
```

## Security notes

- Never commit `.env.local` or real keys.
- `SUPABASE_SECRET_KEY` is server-only.
- Do not run `supabase/seed.sql` against hosted/production.
- Agent conventions: [`AGENTS.md`](AGENTS.md), [`ROLES.md`](ROLES.md).
