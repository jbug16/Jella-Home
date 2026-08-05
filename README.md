# Jella Home

A private household web app for budgets, meals, shopping, recipes, and
subscriptions.

**Current checkpoint:** V1 production cutover is complete. Dashboard, Budget,
Meals, Shopping, Recipes, and Subscriptions use Supabase Auth,
Postgres/RLS, private recipe-image Storage, and a responsive app shell. Supabase
is the sole source of truth; the legacy workbook was a one-time migration source
only. See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the decision log.

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — schema, RLS, repositories, and stack
- [`IMPLEMENTATION.md`](IMPLEMENTATION.md) — roadmap, milestones, and work log
- [`AGENTS.md`](AGENTS.md) — product rules and agent conventions
- [`ROLES.md`](ROLES.md) — specialist role boundaries
- [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md) — idea backlog (not a roadmap)
- [`docs/archive/`](docs/archive/) — completed planning and review notes

Additional runbooks: [`docs/HOSTED_SUPABASE.md`](docs/HOSTED_SUPABASE.md),
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`CURSOR.md`](CURSOR.md) (staging deploy rule).

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

Local seed users are fake test identities defined in `supabase/seed.sql`.
Do not reuse local test credentials in any hosted environment.

Public sign-up is disabled. There is no sign-up page. Local analytics is off in
`supabase/config.toml` for Colima compatibility.

## Hosted Supabase

See [`docs/HOSTED_SUPABASE.md`](docs/HOSTED_SUPABASE.md). Summary: create a
project, disable public email sign-up, `supabase link` + `db push`, put hosted
keys in `.env.local`, then `npm run provision:household`.

## Staging vs production

|         | Staging                                | Production                     |
| ------- | -------------------------------------- | ------------------------------ |
| Branch  | `staging`                              | `main`                         |
| URL     | https://jella-home-staging.netlify.app | https://jella-home.netlify.app |
| Backend | Dedicated staging Supabase project     | Hosted `jella-home` Supabase   |

Full workflow, env scoping, rollback, and the current staging-Supabase setup
gate: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Do not point staging at
production data.

## Scripts

```bash
npm run dev                  # development server
npm run build && npm start   # production build
npm run verify               # format, lint, typecheck, unit, e2e (e2e rebuilds for local Supabase)
npm run verify:staging       # HTTPS smoke probe against the staging URL
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
docs/DEPLOYMENT.md        # local / staging / production hosting
docs/WORKBOOK_MAPPING.md  # completed legacy XLSX → schema migration record
```

## Security notes

- Never commit `.env.local` or real keys.
- `SUPABASE_SECRET_KEY` is server-only.
- Do not run `supabase/seed.sql` against hosted/production.
- Agent conventions: [`AGENTS.md`](AGENTS.md), [`ROLES.md`](ROLES.md).
