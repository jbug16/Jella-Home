# Jella Home: Architecture

This document describes the application architecture: Supabase Postgres is the
application database; Supabase Auth authenticates the two household members.
The existing spreadsheet workbook is a **legacy data source for a one-time
import only**. There is no ongoing Google Sheets synchronization.

Companion docs:

- [`AGENTS.md`](AGENTS.md) — product rules and coding conventions
- [`IMPLEMENTATION.md`](IMPLEMENTATION.md) — roadmap, ADRs, and work log
- [`ROLES.md`](ROLES.md) — agent role boundaries
- [`docs/WORKBOOK_MAPPING.md`](docs/WORKBOOK_MAPPING.md) — legacy XLSX → schema mapping

## Goals

1. Persist household data in a normalized Postgres schema owned by the app.
2. Authorize every row through household membership (Supabase RLS + server checks).
3. Keep UI code free of direct database queries.
4. Support a later one-time import from the existing XLSX workbook.
5. Stay simple: two trusted users, one household, low maintenance.

## Non-goals (current phase)

- Spreadsheet read/write sync or dual-write
- Multi-tenant SaaS features (billing, arbitrary household invites, orgs)
- Product UI for calendar beyond the shell (Budget, Recipes, Meal Planning,
  Shopping, Dashboard, and Subscriptions ship as vertical slices; Calendar
  remains later)
- Dashboard charts, analytics, favorites, notifications, AI recommendations,
  weather, pantry, bank sync, or live updates (summaries + deep-links only)
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

The legacy workbook uses two levels: a **kind** (Income / Bills / Expenses /
Savings / Debt) and a **line item** name. That maps cleanly onto
`budget_categories.kind` + `budget_categories.name`. Planned amounts are
**month-scoped** on the Monthly Budget sheet; actuals are spreadsheet
`SUMIFS` over the Log and must be **derived** in the app from `transactions`,
never stored as imported facts.

Workbook → table mapping: [`docs/WORKBOOK_MAPPING.md`](docs/WORKBOOK_MAPPING.md).

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
  UNIQUE (household_id, kind, name)

budget_month_limits
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  category_id     uuid NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE
  month_start     date NOT NULL       -- first day of the budget month
  limit_cents     integer NOT NULL CHECK (limit_cents >= 0)
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  UNIQUE (category_id, month_start)
  CHECK (month_start = date_trunc('month', month_start)::date)
  -- trigger: category.household_id must equal row.household_id

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

Indexes: `(household_id, occurred_on DESC)`, `(household_id, category_id)`,
`(household_id, month_start)` and `(household_id, category_id)` on
`budget_month_limits`.

Notes:

- Applied in migration `20260716240000_budget_month_limits.sql` (local + types).
- No automatic month-to-month rollover in V1; each month has explicit limits.
  A future “copy previous month” action may be added later.
- Kind-level workbook “Budget” totals are the sum of that kind’s line limits
  for the month (derived). Remaining-to-spend is derived from limits vs
  transaction sums — never stored.
- Income / Bills / Expenses / Savings / Debt are explicit `kind` values.
  Do not encode savings or debt with negative amounts; use `direction` + kind.
- `payee` is unused by the legacy Log; keep it for app entry.

### Recipes and ingredients

A recipe holds metadata plus **ordered** ingredient lines that reference reusable
`ingredients` rows. Ingredient names are normalized so the same ingredient is
**reused** across recipes rather than duplicated. Milestone 7 adds prep/cook time,
a normalized-name unique key, a household-consistency trigger, and an atomic save
RPC (see ADR-014). Applied in migration `*_recipe_slice.sql` (local + hosted + types).

```text
ingredients
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name            text NOT NULL                  -- display form, as entered
  name_normalized text GENERATED ALWAYS AS       -- lower + trim + collapse spaces
                    (regexp_replace(btrim(lower(name)), '\s+', ' ', 'g')) STORED
  default_unit    text NOT NULL DEFAULT ''
  store_section   text NOT NULL DEFAULT ''
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  UNIQUE (household_id, name_normalized)          -- replaces UNIQUE (household_id, name)

recipes
  id                uuid PK
  household_id      uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name              text NOT NULL
  servings          numeric NOT NULL DEFAULT 2 CHECK (servings > 0)
  prep_time_minutes integer NULL CHECK (prep_time_minutes IS NULL OR prep_time_minutes >= 0)
  cook_time_minutes integer NULL CHECK (cook_time_minutes IS NULL OR cook_time_minutes >= 0)
  instructions      text NOT NULL DEFAULT ''
  notes             text NOT NULL DEFAULT ''      -- description / notes
  source_url        text NULL
  archived_at       timestamptz NULL              -- delete = soft archive
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()

recipe_ingredients
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE
  ingredient_id   uuid NOT NULL REFERENCES ingredients(id)
  quantity        numeric NULL CHECK (quantity IS NULL OR quantity > 0)  -- NULL = "to taste"
  unit            text NOT NULL DEFAULT ''
  notes           text NOT NULL DEFAULT ''
  sort_order      int NOT NULL DEFAULT 0          -- preserves ingredient order in a recipe
```

Notes:

- **Delete = soft archive.** Removing a recipe sets `archived_at`; lists exclude
  archived recipes. This preserves future meal-plan / grocery references
  (`planned_meals.recipe_id`, `grocery_list_items.recipe_id` are `ON DELETE SET NULL`).
- **Household consistency.** A trigger `enforce_recipe_ingredient_household`
  (mirroring `budget_month_limits`) requires each `recipe_ingredients` row's
  `household_id` to match both its parent recipe and its ingredient (raises `23514`
  on mismatch, `23503` when a referenced row is missing).
- **Atomic writes.** Recipe create/update go through one `SECURITY INVOKER` RPC
  (`save_recipe_with_ingredients`, `SET search_path = ''`) so the recipe row,
  ingredient reuse (`ON CONFLICT (household_id, name_normalized)`), and ordered lines
  are written in a single transaction under the caller's RLS. Repositories call the
  RPC; they never use the admin client. This avoids the data-loss window in a
  delete-then-reinsert update over PostgREST.
- **Structured first.** Per-line `notes` (e.g. "diced") plus `quantity IS NULL`
  ("to taste") cover cases a plain quantity+unit cannot; there is no freeform
  ingredient-text column.
- Search is `ILIKE` over recipe name (and ingredient name); no extra text index is
  warranted at two-user scale.
- **Cover images (ADR-015).** `recipes.image_path` (nullable) stores an object key
  in the **private** `recipe-images` Storage bucket (jpeg/png/webp, ≤ 5 MB); keys
  are `"{household_id}/{uuid}.{ext}"`. `storage.objects` RLS (SELECT/INSERT/UPDATE/
  DELETE for `authenticated`) is scoped to the bucket and defers to
  `private.can_access_recipe_image(name)`, which parses the leading household folder
  and calls `private.is_household_member` (kept in `private` so it is not an exposed
  RPC). The app never stores URLs — repositories mint short-lived (1 h) signed URLs
  per render via the authenticated client. Image path is written by a guarded update
  outside the atomic RPC. Migrations `*_recipe_images.sql` +
  `*_recipe_images_private_fn.sql`.

### Meal plans

Calendar-day model (not spreadsheet rows). Milestone 5 (weekly planner) builds on
the core table; migration `20260718120000_meal_plan_slice.sql` adds `sort_order`,
a positive servings check, non-empty title integrity, and a recipe
household-consistency trigger (see ADR-016).

```text
planned_meals
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  plan_date       date NOT NULL                  -- calendar day (date-only)
  meal_slot       text NOT NULL
                  CHECK (meal_slot IN ('breakfast','lunch','dinner','snack','other'))
  recipe_id       uuid NULL REFERENCES recipes(id) ON DELETE SET NULL
  custom_title    text NOT NULL                  -- display title / recipe name snapshot
  servings        numeric NULL CHECK (servings IS NULL OR servings > 0)
  notes           text NOT NULL DEFAULT ''
  sort_order      int NOT NULL DEFAULT 0          -- order within day+slot
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  CHECK (length(btrim(custom_title)) > 0)        -- never an empty meal
  -- trigger: when recipe_id is set, recipe.household_id must match row
```

Indexes: `(household_id, plan_date)`, `(recipe_id)`.

Notes:

- **Week-first product surface.** Week bounds are pure domain helpers
  (`weekStartOn` / `daysInWeek`); there is no week table. Week start is
  **Sunday**; `?week=` accepts any date in the week and canonicalizes to that
  Sunday. Grocery `week_start_on` should use the same helper.
- **Title snapshot.** `custom_title` is always the display title. When a recipe
  is assigned, the app copies `recipes.name` into `custom_title` so the meal
  stays labeled if the recipe is later archived or hard-deleted
  (`ON DELETE SET NULL` clears `recipe_id` only).
- **Ordering.** Within a day+slot: `sort_order`, then `created_at`, then `id`.
  New meals (and updates that change date/slot) append (`max(sort_order)+1`).
  No manual reorder UI.
- **UI slots:** breakfast, lunch, dinner, snack (multiple snacks allowed). DB
  keeps `other` for import flexibility; write Zod excludes it.
- **Hard delete** planned meals. Recipes remain soft-archive.
- **No unique** on `(plan_date, meal_slot)` — multiple meals per slot are allowed.
- Grocery generation (Milestone 6) queries this table by week range + joins
  recipe ingredients; do not denormalize ingredients onto meals.

### Grocery lists

Week-scoped shopping lists (Milestone 6). Tables exist from Milestone 2 core
schema; slice migration adds week uniqueness + household consistency (see
ADR-017 in `IMPLEMENTATION.md`). Generation reads `planned_meals` +
`recipe_ingredients` for the week — ingredients are not denormalized onto meals.

```text
grocery_lists
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name            text NOT NULL
  week_start_on   date NULL              -- Sunday; same weekStartOn as meals
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'archived'))
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  -- M6: UNIQUE (household_id, week_start_on) WHERE status = 'active'
  --     AND week_start_on IS NOT NULL

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
  generation_key  text NULL              -- generated buckets only; null for manual
  sort_order      int NOT NULL DEFAULT 0
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  -- UNIQUE (list_id, generation_key) WHERE source = 'generated'
  --     AND generation_key IS NOT NULL
  -- trigger: list/ingredient/recipe household_id must match row
```

Notes:

- **Week start is Sunday.** Same `weekStartOn` / `resolveWeekStartParam` as
  meals. `week_start_on` always stores that canonical Sunday.
- **One active list per week.** Partial unique index prevents duplicate active
  lists for the same Sunday `week_start_on`.
- **`generation_key`.** Deterministic bucket id for generated rows (ingredient
  identity + normalized unit + note identity). Null on manual rows. Partial
  unique `(list_id, generation_key)` for generated rows.
- **Regenerate reconcile** (RPC, list row `FOR UPDATE`): update matching
  generated keys (preserve `is_checked`); insert new keys unchecked; delete
  unchecked generated keys absent from the payload; keep checked orphans as
  historical; never touch manual rows. Idempotent for unchanged inputs.
- **Aggregation** lives in domain TypeScript (`aggregateGroceryLines`): no unit
  conversion in V1; scale by planned/recipe servings.
- **Soft section grouping.** Copy `ingredients.store_section` on generate;
  empty section → flat “List” group. Not a store-routing product feature.

### Subscriptions

Manual recurring-expense tracker (Milestone 9 / ADR-019). Classification stays
separate from budget kinds: `category_label` is free text with **no** foreign
key to `budget_categories`. Monthly equivalents are **derived** — store
cadence + `amount_cents` only. No management URL, custom interval, paused
state, or Record-payment linkage in V1.

```text
subscriptions
  id              uuid PK
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  vendor          text NOT NULL
  category_label  text NOT NULL DEFAULT ''   -- free text (e.g. Tech); not a budget kind
  amount_cents    integer NOT NULL CHECK (amount_cents >= 0)
  cadence         text NOT NULL
                  CHECK (cadence IN (
                    'weekly', 'monthly', 'bimonthly', 'quarterly',
                    'semiannual', 'yearly'
                  ))
  billing_day     smallint NOT NULL CHECK (billing_day BETWEEN 1 AND 31)
  renewal_on      date NULL               -- next billing; required when active (app)
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'archived'))
  notes           text NOT NULL DEFAULT ''
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
```

Index: `(household_id, status, renewal_on)`.

**Lifecycle:** `archived` is the only inactive state (excluded from active
monthly totals and the active list). Delete in the UI soft-archives
(`status → archived`); no restore UI in V1.

**UI:** show charge per cycle (amount + cadence) on each active row; monthly
and yearly totals live in the summary strip. Page order: Summary (monthly /
yearly / active count) → one active list sorted by next billing date.
Per-row Delete confirms and soft-archives; no restore UI.

**Domain helpers** (TypeScript): `monthlyEquivalentCents`, `nextBillingDate`
(month-end / leap via `billing_day`), `subscriptionDueStatus` (domain/tests;
not surfaced in the list UI).

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
                          # (incl. dashboard.ts view-model builders — Milestone 8)
  dashboard/              # server-only home composer (get-dashboard-view-model)
  supabase/
    server.ts             # createServerClient (@supabase/ssr, cookies)
    browser.ts            # auth-only browser client
    admin.ts              # secret-key client (provisioning only; server-only)
    proxy.ts              # session refresh helper used by root proxy.ts
    database.types.ts     # generated (or schema-matched) Database types
  repositories/
    households.ts         # membership (+ member count for Dashboard)
    budget.ts
    meal-plans.ts
    shopping.ts
    recipes.ts
    index.ts              # pattern notes
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
4. Mutations validate with Zod, then revalidate tags/paths. Module mutations that
   affect home summaries also `revalidatePath("/dashboard")`.
5. React components never import Supabase for table access.
6. **Dashboard (Milestone 8)** is a read-only composition layer: a thin
   server-only loader fans out to existing repositories in parallel, then pure
   domain builders produce a `DashboardViewModel`. Do not put snapshot math in
   React; do not add dashboard-specific write RPCs. The home UI does not call
   `getOrCreateGroceryListForWeek`. Recipe covers for today's meals may be
   signed when rendering meal cards.
7. Legacy Google Sheets modules are removed from the app persistence path.

### Dashboard home (composition)

`/dashboard` is the authenticated landing page. It surfaces a household calendar
day agenda (events only — never meals), today's planned meals (with recipe
covers when linked), and the current-month budget summary. It owns **no new
tables** — only a server-only composer and pure view-model builders over
existing repositories. Calendar event CRUD arrives in a later milestone; until
then the day agenda is empty. See `IMPLEMENTATION.md` Milestone 8 and ADR-018.

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
