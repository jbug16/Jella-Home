# Jella Home: Architecture

This document describes the application architecture: Supabase Postgres is the
application database; Supabase Auth authenticates the two household members.
The existing spreadsheet workbook is a **legacy data source for a one-time
import only**. There is no ongoing Google Sheets synchronization.

Companion docs:

- [`AGENTS.md`](AGENTS.md) — product rules and coding conventions
- [`IMPLEMENTATION.md`](IMPLEMENTATION.md) — roadmap, ADRs, and work log
- [`ROLES.md`](ROLES.md) — agent role boundaries

## Goals

1. Persist household data in a normalized Postgres schema owned by the app.
2. Authorize every row through household membership (Supabase RLS + server checks).
3. Keep UI code free of direct database queries.
4. Support a later one-time import from the existing XLSX workbook.
5. Stay simple: two trusted users, one household, low maintenance.

## Non-goals (current phase)

- Spreadsheet read/write sync or dual-write
- Multi-tenant SaaS features (billing, arbitrary household invites, orgs)
- Product UI for budget/meals/recipes beyond the existing shell
- Native mobile clients
- Public self-serve sign-up

## High-level stack

| Layer         | Choice                                                              |
| ------------- | ------------------------------------------------------------------- |
| UI            | Next.js App Router, React Server Components, Tailwind, shadcn/ui    |
| Auth          | Supabase Auth (email/password); no public registration              |
| Database      | Supabase Postgres (local for M2 dev/tests; hosted for deploy)       |
| Authorization | Household membership + Postgres Row Level Security                  |
| Validation    | Zod (domain + server action inputs)                                 |
| Data access   | Server-only repositories using the cookie-backed SSR client         |
| Hosting       | Netlify (existing)                                                  |
| Legacy import | One-time script reading XLSX from `private-data/` (later milestone) |

```
Browser
  └─ Next.js (RSC / Server Actions)
       └─ lib/repositories/*          (typed domain API)
            └─ lib/supabase/server    (cookie-backed SSR client → RLS)
                 └─ Supabase Postgres (+ RLS)

Provisioning / admin only
  └─ lib/supabase/admin             (secret key; bypasses RLS)
       └─ scripts/provision-household.ts (hosted bootstrap)
```

Auth session cookies use `@supabase/ssr` (not the deprecated auth-helpers
packages). On Next.js 16, session refresh and unauthenticated redirects run in
root `proxy.ts` (the replacement for deprecated `middleware.ts`). Client
components may use a browser Supabase client **only for auth UI** (sign-in,
sign-out, session refresh). They must not query product tables.

## Environment variables

Use the current Supabase key model:

| Variable                               | Visibility  | Purpose                                         |
| -------------------------------------- | ----------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public      | Project URL                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public      | Publishable key for browser + SSR user clients  |
| `SUPABASE_SECRET_KEY`                  | Server-only | Secret key for provisioning/admin; bypasses RLS |

Do **not** name app env vars `ANON_KEY` / `SERVICE_ROLE_KEY` unless installed
tooling strictly requires a compatibility alias. Local Supabase CLI may still
_emit_ legacy `anon` / `service_role` JWT values — copy those values into the
publishable/secret variable names above when configuring `.env.local`.

## Persistence decision

| Concern                 | Decision                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| Source of truth         | Supabase Postgres                                                |
| Auth                    | Email/password via Supabase Auth; no public sign-up page or flow |
| Member permissions (V1) | Both household members have equal read/write                     |
| Google Sheets / XLSX    | Legacy import source only; no sync                               |
| Stable IDs              | UUID primary keys in Postgres; never sheet row numbers           |
| Money                   | Integer cents (`amount_cents`)                                   |
| Dates                   | SQL `date` for date-only records (meals, transaction dates)      |

ADR-001 (Google Sheet as initial source of truth) is **superseded**. See
`IMPLEMENTATION.md`.

## Domain model (normalized schema)

All product tables include `household_id` (directly or via a parent that does)
so RLS policies stay simple and indexable. Timestamps use `timestamptz`.
Soft-archive where helpful (`archived_at`) instead of hard-deleting shared
reference data.

### Households and members

```text
households
  id              uuid PK DEFAULT gen_random_uuid()
  name            text NOT NULL
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()

household_members
  id              uuid PK DEFAULT gen_random_uuid()
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  display_name    text NOT NULL
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'member'))
  created_at      timestamptz NOT NULL DEFAULT now()
  UNIQUE (household_id, user_id)
  UNIQUE (user_id)   -- V1: each user belongs to exactly one household
```

Notes:

- V1 assumes **one household** and **two members**. The schema still uses
  `household_id` everywhere so policies and repositories stay correct.
- `role` is reserved for future bootstrap distinctions; **both members have
  equal read/write** on household data in V1 (enforced by identical RLS
  policies — no per-role feature gates).
- Auth users are created manually or via a **server-only provisioning script**.
  There is no public registration UI.

### Budget

```text
budget_categories
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name            text NOT NULL
  kind            text NOT NULL
                  CHECK (kind IN ('income', 'expense', 'bill', 'savings', 'debt'))
  sort_order      int NOT NULL DEFAULT 0
  archived_at     timestamptz NULL
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  UNIQUE (household_id, name)

transactions
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  category_id     uuid NOT NULL REFERENCES budget_categories(id)
  amount_cents    integer NOT NULL          -- always positive magnitude
  direction       text NOT NULL
                  CHECK (direction IN ('in', 'out'))
  occurred_on     date NOT NULL
  payee           text NOT NULL DEFAULT ''
  notes           text NOT NULL DEFAULT ''
  created_by      uuid NULL REFERENCES auth.users(id)
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
```

Indexes: `(household_id, occurred_on DESC)`, `(household_id, category_id)`.

### Recipes and ingredients

```text
ingredients
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name            text NOT NULL
  default_unit    text NOT NULL DEFAULT ''
  store_section   text NOT NULL DEFAULT ''
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  UNIQUE (household_id, name)

recipes
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name            text NOT NULL
  servings        numeric NOT NULL DEFAULT 2 CHECK (servings > 0)
  instructions    text NOT NULL DEFAULT ''
  notes           text NOT NULL DEFAULT ''
  source_url      text NULL
  archived_at     timestamptz NULL
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()

recipe_ingredients
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE
  ingredient_id   uuid NOT NULL REFERENCES ingredients(id)
  quantity        numeric NOT NULL CHECK (quantity > 0)
  unit            text NOT NULL DEFAULT ''
  notes           text NOT NULL DEFAULT ''
  sort_order      int NOT NULL DEFAULT 0
```

### Meal plans

```text
planned_meals
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  plan_date       date NOT NULL
  meal_slot       text NOT NULL
                  CHECK (meal_slot IN ('breakfast','lunch','dinner','snack','other'))
  recipe_id       uuid NULL REFERENCES recipes(id) ON DELETE SET NULL
  custom_title    text NULL
  servings        numeric NULL
  notes           text NOT NULL DEFAULT ''
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  CHECK (recipe_id IS NOT NULL OR custom_title IS NOT NULL)
```

### Grocery lists

```text
grocery_lists
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name            text NOT NULL
  week_start_on   date NULL
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'archived'))
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()

grocery_list_items
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  list_id         uuid NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE
  name            text NOT NULL
  quantity        numeric NULL
  unit            text NOT NULL DEFAULT ''
  store_section   text NOT NULL DEFAULT ''
  is_checked      boolean NOT NULL DEFAULT false
  source          text NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual', 'generated'))
  ingredient_id   uuid NULL REFERENCES ingredients(id) ON DELETE SET NULL
  recipe_id       uuid NULL REFERENCES recipes(id) ON DELETE SET NULL
  notes           text NOT NULL DEFAULT ''
  sort_order      int NOT NULL DEFAULT 0
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
```

### Subscriptions

```text
subscriptions
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  vendor          text NOT NULL
  category_id     uuid NULL REFERENCES budget_categories(id) ON DELETE SET NULL
  amount_cents    integer NOT NULL CHECK (amount_cents >= 0)
  cadence         text NOT NULL
                  CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'yearly'))
  renewal_on      date NULL
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'canceled'))
  notes           text NOT NULL DEFAULT ''
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
```

### Deferred: shared calendar

Household calendar events remain in the product roadmap but are **out of the
Milestone 2 schema**. A future `calendar_events` table will follow the same
`household_id` + RLS pattern.

## Authorization model

### Principles

1. Every authenticated user who uses the app must appear in `household_members`.
2. RLS is the database backstop; repositories never trust client-supplied
   `household_id` without membership.
3. **Normal repositories use the authenticated cookie-backed SSR client** so
   RLS stays enforced. The secret/admin client is **not** the default.
4. The secret key client may be used only in explicit server-only provisioning
   or administrative code (e.g. `scripts/provision-household.ts`, one-time
   import later).
5. Public registration is disabled. There is no sign-up page. Auth users are
   created manually in the dashboard or via the provisioning script.
6. Committed migrations define schema only. Local seeds use **fake** users and
   data. Hosted provisioning is a separate server-only script or documented
   manual step — never real emails or production Auth UUIDs in git.

### Membership helper (SECURITY DEFINER, hardened)

Lives in the non-API `private` schema so it is not exposed as
`/rest/v1/rpc/...` on `public`.

```sql
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_household_member(target_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members AS hm
    WHERE hm.household_id = target_household_id
      AND hm.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.is_household_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_household_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION private.is_household_member(uuid) TO authenticated;
```

Hardening requirements:

- Fixed `search_path` (`''` with schema-qualified identifiers)
- No dynamic SQL
- Not in an API-exposed schema
- Minimal `EXECUTE` (authenticated only; anon revoked)
- Covered by explicit RLS / pgTAP tests

### RLS policy pattern

Enable RLS on every product table. Member policies:

- `SELECT` / `INSERT` / `UPDATE` / `DELETE` with
  `USING (public.is_household_member(household_id))` and matching `WITH CHECK`
- Updates that change `household_id` must fail `WITH CHECK` when the new value
  is not a household the user belongs to

Special cases:

- `households`: members can `SELECT` (and update name); inserts are
  secret-key / provisioning only (no open self-serve create).
- `household_members`: members can `SELECT` their household’s rows; inserts,
  deletes, and membership changes are provisioning/admin only in V1.

### Required database tests

pgTAP (or equivalent) must prove:

1. Anonymous access is denied on all product tables
2. Authenticated non-members are denied
3. Members can read and write their household
4. Cross-household reads and writes are denied
5. `household_id` cannot be reassigned to an unauthorized household
6. RLS is enabled on all product tables

### App-layer guards

- Protect `app/(app)/*` with Next.js `proxy.ts` session checks + layout membership gate
- Unauthenticated users → `/sign-in` (email/password only; no sign-up link)
- Authenticated users without membership → `/not-provisioned`
- Sign-out clears Supabase session cookies

## Repository / service layer

```text
lib/
  domain/                 # Zod schemas + pure domain types/utils
  supabase/
    server.ts             # createServerClient (@supabase/ssr, cookies)
    browser.ts            # auth-only browser client
    admin.ts              # secret-key client (provisioning only; server-only)
    proxy.ts              # session refresh helper used by root proxy.ts
    database.types.ts     # generated (or schema-matched) Database types
  repositories/
    households.ts         # M2: membership path implemented
    index.ts              # pattern notes; product repos land per feature
scripts/
  provision-household.ts  # create household + two Auth members (secret key)
  add-household-member.ts # add one member to an existing household
  verify-hosted-access.ts # equal-permission + non-member denial checks
```

Rules:

1. Repositories accept/return domain types.
2. **Default path:** `createClient()` from `lib/supabase/server.ts` (user JWT /
   cookies). RLS applies.
3. **Admin path:** `createAdminClient()` from `lib/supabase/admin.ts` only
   inside provisioning/administrative modules. Never import admin from UI or
   normal repositories.
4. Mutations validate with Zod, then revalidate tags/paths.
5. React components never import Supabase for table access.
6. Milestone 2 implements the **household/auth membership** repository only.
   Budget, recipes, meals, grocery, and subscription repositories arrive with
   their feature milestones — tables and RLS exist now so features can land
   safely later.
7. Legacy Google Sheets modules are removed from the app persistence path.

## Migrations, seeds, and TypeScript types

### Migrations

- SQL under `supabase/migrations/` (`YYYYMMDDHHMMSS_description.sql`)
- Migrations define **schema, indexes, functions, and RLS only**
- Never put real emails or production Auth user UUIDs in migrations

### Seeds (local only)

- `supabase/seed.sql` (and helpers) create **fake** auth users and fixture
  households for local reset/RLS testing
- Seeds are for `supabase db reset` locally — not production cutover

### Hosted provisioning

See [`docs/HOSTED_SUPABASE.md`](docs/HOSTED_SUPABASE.md) for the full runbook.

- `npm run provision:household` — one household + two Auth users
- `npm run provision:add-member` — additional member on an existing household
- `npm run verify:hosted-access` — equal read/write + non-member denial
- Inputs come from environment / `.env.local` — never committed
- Never run `supabase/seed.sql` against hosted/production

### Generated types

```bash
npm run supabase:types   # wraps: supabase gen types typescript --local
# or --linked when working against a hosted project
```

Commit `lib/supabase/database.types.ts` so CI/Netlify builds do not need the CLI.

### Local and hosted workflows

| Mode   | Runtime             | Typical commands                                        |
| ------ | ------------------- | ------------------------------------------------------- |
| Local  | Colima + Docker CLI | `supabase start`, `db reset`, `test:db`                 |
| Hosted | Supabase cloud      | `supabase link`, `db push`, advisors, provision scripts |

Local analytics is disabled in `config.toml` because Colima cannot mount the
host docker.sock into the vector container. Re-enable under Docker Desktop if
log analytics are needed locally.

## Pre-production checklist (before first real household data)

1. Hosted Auth: public sign-up disabled; email/password enabled.
2. Migrations pushed; `migration list` local == remote.
3. RLS enabled on all product tables; advisors reviewed.
4. FK indexes present (see migration `*_fk_indexes.sql`).
5. Household provisioned via script (not SQL seed).
6. Equal-permission + non-member checks pass (`verify:hosted-access`).
7. Netlify env uses publishable + secret key names (secret server-only).
8. Site URL / redirect allowlist includes local and production origins.

## One-time workbook import (later)

Not part of Milestone 2. Deferred to its own milestone after repositories for
the imported domains exist.

Constraints: service-role/secret key only, XLSX under `private-data/`, no
bidirectional sync, no real workbook in git.

## Security notes

- `SUPABASE_SECRET_KEY` is server-only; never `NEXT_PUBLIC_`.
- Publishable key may be `NEXT_PUBLIC_` for browser auth only.
- RLS stays enabled on all product tables.
- Disable public sign-up in Supabase Auth settings (local `config.toml` and
  hosted dashboard).
- Do not log tokens, secret keys, or full financial datasets.
- Run Supabase Security Advisor and Performance Advisor against the hosted
  project before marking Milestone 2 complete; resolve or document findings.
