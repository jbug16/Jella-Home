# Jella Home: Implementation Plan

This is the live project roadmap and decision log. Keep it current after every meaningful task or milestone. It should describe the repository as it exists now, not an aspirational document that drifts from the code.

## Status legend

- `Not started`
- `In progress`
- `Blocked`
- `Complete`

## Current milestone

**Milestone:** 9 — Subscription tracker  
**Status:** Not started (awaiting plan when ready)  
**Owner:** Lead Engineer  
**Goal:** Track household subscriptions with cadence conversions, renewal dates,
and status — clearer than the legacy Subscription Tracker sheet.

Previous: Milestone 8 (Dashboard home) **approved** and shipped 2026-07-20
(local `verify` + `test:db` ×2; no new migrations). Dashboard:
[Milestone 8](#8-dashboard-home) / ADR-018.

### Pre-work completed

**Workbook discovery** — Complete. Artifact:
[`docs/WORKBOOK_MAPPING.md`](docs/WORKBOOK_MAPPING.md).

**Schema adjustment** — Complete (local + hosted). Migration
`20260716240000_budget_month_limits.sql`:

- [x] `budget_month_limits` + RLS + household-consistency trigger
- [x] `UNIQUE (household_id, kind, name)` on `budget_categories`
- [x] `subscriptions.category_label`; dropped `subscriptions.category_id`
- [x] Types regenerated; `npm run test:db` 25/25; `npm run verify` green
- [x] Push migration to hosted Supabase; local/remote migration lists match (5)
- [x] Budget product UI (Milestone 4 complete)

### Milestone 2 acceptance criteria

- [x] Email/password auth; no public sign-up page or flow.
- [x] Env uses `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- [x] Cookie-backed SSR client (`@supabase/ssr`) is the default repository client; secret/admin client is provisioning-only.
- [x] Core schema + hardened `is_household_member` + RLS migrations committed.
- [x] Local seed uses fake users only; hosted provisioning via `scripts/provision-household.ts`.
- [x] Household membership repository implemented; product repos deferred.
- [x] Protected routes, sign-in, sign-out, not-provisioned states.
- [x] pgTAP RLS tests authored under `supabase/tests/`.
- [x] `npm run test:db` green against local Supabase (Colima + Docker CLI).
- [x] Security + Performance advisors run against linked hosted project (0 findings after private-fn migration).
- [x] App `verify` gate (format/lint/typecheck/unit/build/e2e) green.
- [x] Local `.env.local` populated from `supabase status` (gitignored; not committed).
- [x] FK index migration + hosted runbook + add-member / verify-hosted-access scripts.
- [x] Hosted migrations pushed; local/remote migration list matches (4 migrations).
- [x] Household provisioned on hosted; equal-permission + non-member checks pass.
- [x] Hosted Auth: public email sign-up disabled (`signUp` → "Signups not allowed for this instance").
- [x] `.env.local` pointed at hosted project URL/keys (gitignored).

### Approved revisions (applied to this plan)

1. Scaffold with `create-next-app` directly (no separate `npm init`).
2. Pin Node to major 24: `.nvmrc` and `engines` `>=24 <25`.
3. Use the latest stable Next.js from the npm `latest` tag only (no preview/canary/beta/rc).
4. Shared route-group `loading.tsx` and `error.tsx` boundaries; no per-page repetition.
5. Two navigation modes: sidebar (desktop + iPad landscape) and mobile navigation (phones + iPad portrait).
6. Light mode only for V1, with semantic design tokens so dark mode can be added later.
7. Pure env parsing in `lib/config/env-schema.ts`; `lib/env.ts` stays server-only; unit-test the pure parser.
8. Do not globally ignore CSV/XLSX. Ignore a dedicated private-data directory plus credential file patterns.
9. Add a small Playwright WebKit smoke suite for iPhone and iPad viewports (real targets use Safari).
10. Vitest for pure/synchronous code; Playwright for async Server Components and full workflows.
11. Install only the shadcn components the current shell needs; add more per feature as implemented.

## Milestones

### 1. Project foundation

**Status:** Complete

Scope:

- Repository setup
- Next.js App Router and TypeScript
- Tailwind and shadcn/ui
- Base layout and navigation shell
- Environment validation
- Testing setup
- CI or local verification commands

Out of scope:

- Real Google Sheets data
- Complete authentication
- Full budget or meal workflows

#### Technical approach

- Scaffold directly with `create-next-app` (App Router, TypeScript, Tailwind, ESLint, `@/*` alias). No separate `npm init`.
- Next.js from the npm `latest` tag only. Reject preview/canary/beta/rc.
- TypeScript `strict: true`; React Server Components by default; `"use client"` only where required (mobile nav toggle).
- Tailwind + shadcn/ui installed via the shadcn MCP so registry/CLI versions match. Commit `components.json`. Install only the components the shell needs now; add more per feature.
- Light mode only for V1. Define semantic design tokens (CSS variables such as `--background`, `--foreground`, `--muted`, `--border`, `--primary`) so a dark theme can be layered later without refactoring components. No `next-themes` in V1.
- Two navigation modes driven by one nav config source (`components/layout/nav-items.ts`):
  - Sidebar for desktop and iPad landscape (>= `lg`).
  - Mobile navigation (bottom bar: 4 primary destinations + a "More" Sheet for the rest) for phones and iPad portrait.
- Secrets/server boundary: `lib/env.ts` imports `server-only` and composes the pure parser. Pure, dependency-free parsing/validation lives in `lib/config/env-schema.ts` (Zod), unit-testable without server context. Private key `\n` normalization happens in the pure parser. Env validated lazily (first server access), not at module top-level, so a secret-less `next build`/CI does not fail. Never log values.
- `lib/` gets typed stubs/interface notes only (`google-sheets/`, `repositories/`, `domain/`, `config/`); real logic is Milestone 3.
- Deployment (Netlify) config is deferred to Milestone 10; M1 only ensures build/verify pass and `.netlify` is git-ignored.

#### Specific tasks

1. `npx create-next-app@latest` with TS + Tailwind + ESLint + App Router + `@/*` alias.
2. Add `.nvmrc` (24) and `package.json` `engines` `{ "node": ">=24 <25" }`.
3. Init shadcn via MCP; install only shell components (see Dependencies).
4. Define semantic design tokens in `globals.css` (light values only) and Tailwind theme mapping.
5. Build the shell: root layout (fonts, `lang`, safe-area vars, base body) and `(app)` route-group layout rendering sidebar + mobile nav + `<main>`, header with skip-to-content link.
6. Add shared `(app)/loading.tsx` and `(app)/error.tsx` route-group boundaries (no per-page duplication).
7. Create placeholder pages for the 7 domains, each using shared `PageHeader` + `EmptyState` ("coming soon").
8. Add `lib/config/env-schema.ts` (pure Zod parser + key normalization), `lib/env.ts` (server-only, lazy), `.env.example`, and typed stub folders.
9. Add `.gitignore`: dedicated `private-data/` directory, credential patterns (`*service-account*.json`, `*credentials*.json`, `*.pem`), `.env*` with `!.env.example`, `.netlify`. Do NOT globally ignore `*.csv`/`*.xlsx`.
10. Configure Prettier (+ `format:check`), Vitest + Testing Library (pure-function tests incl. env-schema parser), Playwright (Chromium projects at 1280x800 and 360x780; WebKit projects for iPhone and iPad viewports; `webServer` on the production build).
11. Add npm scripts incl. a single `verify` gate; write `README.md` (setup, env, Playwright install, verification).

#### Proposed file structure

```
app/
  layout.tsx                      # root: fonts, lang, safe-area vars
  globals.css                     # semantic design tokens (light)
  (app)/
    layout.tsx                    # shell: sidebar + mobile nav + <main>
    loading.tsx                   # shared route-group loading boundary
    error.tsx                     # shared route-group error boundary
    dashboard/page.tsx
    budget/page.tsx
    meals/page.tsx
    shopping/page.tsx
    recipes/page.tsx
    subscriptions/page.tsx
    calendar/page.tsx
components/
  layout/{app-header,app-sidebar,mobile-nav}.tsx
  layout/nav-items.ts             # single nav config (label, href, icon, primary?)
  common/{page-header,empty-state}.tsx
  ui/*                            # shadcn generated (shell-only set)
lib/
  config/env-schema.ts            # pure Zod parser + private-key normalization (tested)
  config/sheets.ts                # centralized sheet/range map (stub)
  env.ts                          # server-only, lazy composition of the pure parser
  google-sheets/index.ts          # stub / interface note (real logic = M3)
  repositories/index.ts           # stub / interface note (real logic = M3)
  domain/index.ts                 # shared types placeholder
tests/
  unit/env-schema.test.ts         # pure parser tests (Vitest)
  e2e/shell.chromium.spec.ts      # desktop + 360 smoke
  e2e/shell.webkit.spec.ts        # iPhone + iPad Safari smoke
private-data/.gitkeep             # git-ignored contents (local spreadsheets/exports)
.env.example  .gitignore  .nvmrc  components.json
prettier/vitest/playwright configs
README.md
```

#### Dependencies

- Runtime: `next` (latest stable), `react`, `react-dom`, `zod`, `server-only`, `tailwindcss`, `lucide-react`, and only the shell shadcn primitives: `button`, `sheet`, `separator`, `scroll-area`, `skeleton`. (Add `tooltip`, `dropdown-menu`, `sonner`, etc. when a feature needs them.)
- Dev: `typescript`, `@types/*`, `eslint` + Next config, `prettier`, `vitest`, `@testing-library/react`, `jsdom`, `@playwright/test`. Optional `@axe-core/playwright`.
- Tooling: Node major 24 (pinned), npm.

#### Verification commands

```bash
npm ci
npx playwright install --with-deps chromium webkit   # one-time / CI
npm run format:check
npm run lint
npm run typecheck
npm run test            # Vitest, pure functions
npm run build           # next build (must pass without secrets)
npm run test:e2e        # Playwright against the production build
npm run verify          # single gate chaining all of the above
git check-ignore -v private-data/local.csv service-account.json .env.local
git check-ignore .env.example || echo "OK: .env.example is tracked"
```

npm scripts: `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `format`, `format:check`, `test`, `test:watch`, `test:e2e`, `verify`.

### 2. Authentication, household access, and Supabase foundation

**Status:** In progress (local Supabase + RLS green; hosted advisors still pending)

Scope:

- Supabase Auth email/password; no public registration
- Local Supabase for migrations/seeds/RLS tests; hosted link supported
- Equal read/write for both household members
- Core Postgres schema + RLS (see `ARCHITECTURE.md`)
- Cookie-backed SSR repositories; secret client for provisioning only
- Database types committed; household membership repository only
- Protected routes, sign-in/sign-out, not-provisioned
- Retire Google Sheets app-backend stubs

Out of scope:

- Product UI for budget, meals, shopping, recipes, subscriptions, calendar
- Spreadsheet synchronization / XLSX import (Milestone 3)
- Full product repositories (land with feature milestones)
- Netlify Identity

#### Approved decisions (2026-07-16)

1. Email/password authentication.
2. No public sign-up; Auth users created manually or via server-only provisioning.
3. Local Supabase for M2 migrations/seeds/resets/RLS; also support hosted link.
4. Both members have equal read/write in V1.
5. Key model: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
6. Normal repositories use cookie-backed SSR client (RLS enforced).
7. Secret/admin client only in explicit provisioning/admin code.
8. `@supabase/ssr` only (no deprecated auth-helpers).
9. No sign-up page; public registration disabled in `config.toml` / hosted Auth settings.
10. Migrations = schema only; local seeds = fake data; hosted provisioning separate.
11. Hardened `SECURITY DEFINER` membership helper + explicit RLS tests.
12. Run Security and Performance advisors on hosted before marking complete.

#### Verification commands

```bash
npm run verify
npm run supabase:start && npm run supabase:reset && npm run test:db
npm run supabase:advisors   # requires supabase link
```

### 3. One-time workbook import (deferred)

**Status:** Not started

Scope:

- Read-only parse of the legacy XLSX under `private-data/`
- Map tabs into Postgres domain tables for one household
- Idempotent or clear-and-reload import with service role
- Validation/spot-check of counts and totals
- Explicit documentation of workbook → schema mapping

Out of scope:

- Live Google Sheets API sync
- Dual-write back to the spreadsheet
- Blocking product verticals (budget/meals may proceed on empty/seed data before import)

### 4. Budget vertical slice

**Status:** Complete

#### Approved product rules (from workbook discovery)

1. Planned limits live in `budget_month_limits` (explicit per month; no V1 rollover).
2. Actuals, remaining, kind totals, and dashboard numbers are **derived**.
3. Kinds: `income` | `bill` | `expense` | `savings` | `debt` — never negative amounts.
4. Subscriptions use `category_label` (no FK to budget categories).
5. XLSX import stays deferred; Budget ships on empty/seed data first.

#### Implemented approach

**Domain / money** (`lib/domain/budget.ts`)

- Zod schemas: category, month limit, transaction.
- Positive integer cents for transactions; separate `direction` (`in`/`out`).
- Planned limits may be zero cents; transactions reject ≤0 at validation.
- `month_start` is always the first of the month (date-only strings).
- `buildBudgetMonthSnapshot` derives planned, actual, remaining, kind and
  category summaries (nothing stored).

**Repositories** (`lib/repositories/budget.ts`, cookie SSR client + RLS)

- `listCategories`, `createCategory`
- `listMonthLimits`, `upsertMonthLimit`
- `listTransactionsForMonth`, `createTransaction`,
  `updateTransaction`, `deleteTransaction`
- Direction resolved from category kind on write.

**Server Actions** (`app/(app)/budget/actions.ts`)

- Zod-validated form actions; `revalidatePath("/budget")` after mutations.
- Submit controls disabled while pending; recoverable errors preserve inputs.

**UI**

- Month navigator; derived summary totals; category rows; transaction list.
- Add/edit/delete flows; create category; set month limit.
- Dialog on desktop, Sheet on mobile (`responsive-form-shell`).

**Out of scope (unchanged)**

- Workbook import / seed from XLSX
- Subscription tracker UI
- Automatic rollover / “copy previous month”
- Multi-month charts, exports, attachments, dashboard cards

#### Acceptance criteria

- [x] Members can set/edit a category’s planned `limit_cents` for a month.
- [x] Members can add and edit a transaction (amount in cents, category, date,
      optional payee/notes).
- [x] Monthly summary shows planned vs actual vs remaining by kind and overall.
- [x] Destructive delete confirms; submit disabled while saving.
- [x] Usable at 360×780, 390×844, iPad portrait, desktop ≥1280; no horizontal
      scroll at 360px; ≥44px touch targets.
- [x] Vitest covers cents math and month-boundary helpers.
- [x] Playwright: add + edit + delete expense on desktop and 360px mobile
      (seeded summary asserted). Month nav / category / limit / overspend /
      empty / income flows are UI-wired and unit-covered; expand e2e later if
      needed.
- [x] `npm run verify` and `npm run test:db` green.
- [x] No stored actuals/remaining; no importer.

#### Verification gate

```bash
npm run test:db
npm run verify
# Playwright includes budget expense flow at desktop + 360
```

#### Risks

- Timezone shifts on `occurred_on` / `month_start` if parsed as JS `Date` noon UTC incorrectly — use date-only strings.
- Empty first-run UX: need a clear path to create a category + limit before logging spend.
- Hosted DB must receive the new migration before production Budget use.

### 5. Weekly meal planner

**Status:** Complete — approved 2026-07-19

Week-first meal planner as the household’s central planning surface. Modelled on
**calendar days** (not spreadsheet rows). Reuses Budget navigator / form-shell
patterns and Recipe picker / soft-archive conventions. Implemented with Sunday
week start and title-snapshot integrity (ADR-016). Presentation is the Image
Week Board (day columns of meal tiles; phone day spine).

#### In scope

- Week navigation (`?week=YYYY-MM-DD` Sunday week-start) with prev / next /
  Jump to this week (stable fixed-width week chrome)
- Meal slots: **Breakfast, Lunch, Dinner, Snack** (multiple per day/slot ok)
- Assign an active recipe **or** a custom title (takeout / ad-hoc); multi-day
  create from one form
- Optional servings (default from recipe when assigned; hidden when 2) and notes
- Click tile to edit (including day/slot); compact delete with confirmation
- Recipe image on tile when present; no placeholder when missing; one-line title
- Empty, loading, validation, and error states
- Accessible, responsive layouts (desktop week board; phone day-focus)

#### Out of scope (deferred / other milestones)

Grocery-list generation from planned meals (Milestone 6), leftovers workflows,
recurring / repeating meal templates, 5-week workbook multi-grid, shared calendar
events, nutrition, workbook import, drag-and-drop reorder, exposing the DB
`other` slot in the UI, and dashboard meal summaries.

#### Schema changes — migration `20260718120000_meal_plan_slice.sql` (ADR-016)

`planned_meals` already existed from Milestone 2. This slice added:

1. `sort_order integer NOT NULL DEFAULT 0` — stable order within day+slot.
2. `CHECK (servings IS NULL OR servings > 0)`.
3. Strengthened title integrity: `custom_title NOT NULL` +
   `CHECK (length(btrim(custom_title)) > 0)` (replaces the old
   `recipe_id OR custom_title` CHECK). `custom_title` is the display title /
   recipe name snapshot.
4. Trigger `enforce_planned_meal_recipe_household`.
5. Regenerated `lib/supabase/database.types.ts`.

**Not changed:** meal_slot CHECK (keep `other` in DB), no unique on
`(plan_date, meal_slot)`, no soft-delete on meals, no week table, no leftover /
recurrence columns.

#### Domain — `lib/domain/meal-plan.ts` (+ shared dates)

Extract shared date-only helpers used by Budget into `lib/domain/dates.ts`
(`isoDateSchema`, `todayIsoDate`, and any purely date utilities) so meal-plan does
not import the budget module. Budget keeps month helpers; meal-plan owns week
helpers.

- Zod: `mealSlotSchema` = `breakfast | lunch | dinner | snack` (writes; hide
  `other`); read mapper accepts DB `other` if present.
- Schemas: `plannedMealSchema`, `createPlannedMealInputSchema`,
  `updatePlannedMealInputSchema` — at least one of `recipeId` / `customTitle`.
- Week helpers (**Sunday** week start — ADR-016): `weekStartOn`, `weekEndOn`,
  `shiftWeekStart`, `daysInWeek`, `resolveWeekStartParam` (any date → Sunday;
  invalid/missing → current week). All math on `YYYY-MM-DD` via local
  `Date(y, m-1, d)` — never UTC midnight / `toISOString`.
- Ordering: `sort_order`, then `created_at`, then `id`. Append on create and
  when update changes date/slot.
- Row→domain mappers include join fields `recipeName`, `recipeArchived`; domain
  `title` maps to `custom_title`.

#### Repositories — `lib/repositories/meal-plans.ts` (cookie SSR + RLS)

Never the admin client. All call `requireCurrentMembership()`.

- `listPlannedMealsForWeek(weekStart)` — household range query; left-join recipes
  for name + `archived_at`; order by `plan_date`, slot order, `sort_order`, `id`.
- `getPlannedMeal(id)` — membership-scoped; null when missing.
- `createPlannedMeal(input)` — set `household_id` from membership; reject
  archived recipe on new assign; snapshot recipe name into `custom_title`; copy
  recipe servings when omitted; append `sort_order`.
- `updatePlannedMeal(input)` — load first; refresh title snapshot when linking a
  recipe; append `sort_order` when date/slot changes.
- `deletePlannedMeal(id)` — hard `DELETE`.

Picker lists active recipes only. Existing meals keep the title snapshot if the
recipe is later archived or removed.

#### Server actions — `app/(app)/meals/actions.ts`

`{ error, success }` state pattern like Budget/Recipes.

- `createPlannedMealAction`, `updatePlannedMealAction`, `deletePlannedMealAction`
- Zod validate → repo → `revalidatePath("/meals")`
- Submit disabled while pending; recoverable errors preserve input; household-
  friendly messages only

RSC page loads the week via `listPlannedMealsForWeek` (no list action).

#### UI structure

- `app/(app)/meals/page.tsx` (RSC): canonicalize `?week=` to Sunday (redirect);
  load meals + recipes; render `MealsPanel`.
- `components/meals/`: `week-navigator`, `meals-panel` (narrow day-strip vs
  desktop week grid via `matchMedia`), `meal-chip` (click-to-edit + delete),
  `meal-form-dialog`, `delete-meal-dialog`, `recipe-combobox`.
- Reuse: `PageHeader`, `ResponsiveFormShell`, `AlertDialog`, `Textarea`, `Select`.

**Layout rules**

| Viewport              | Layout                                                      |
| --------------------- | ----------------------------------------------------------- |
| Desktop ≥1280         | 7-column week grid; Dialog forms                            |
| iPad landscape        | Week grid if columns usable; else day-strip                 |
| iPad portrait / phone | Day-strip (7 chips) + vertical slot list; Sheet forms       |
| 360×780               | No page horizontal scroll; ≥44px targets; safe-area padding |

Empty week keeps the full structure with empty Add slots plus a soft “Nothing
planned yet” line — do not replace the planner with a single Coming-soon card.

#### Future extension points (design only — do not build)

| Future                  | Leave room by                                                                                                                  | Avoid now                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Grocery generation (M6) | `listPlannedMealsForWeek` + recipe ingredient joins; `grocery_lists.week_start_on` already exists — see [§6](#6-shopping-list) | Denormalized ingredients on meals; meal↔list junction |
| Leftovers               | Later nullable `source_planned_meal_id` or flag                                                                                | Soft-delete + leftover enum on every row              |
| Recurring meals         | Later template / recurrence table                                                                                              | RRULE engine, generated series                        |

Do not add a “Generate shopping list” CTA on Meals chrome in this slice.

#### Testing strategy

- **Vitest** `tests/unit/meal-plan.test.ts` (+ dates helpers): week start/end/
  shift across month/year; slot validation; create/update Zod; `displayTitle`;
  row mappers; snack vs `snack` label mapping. No DnD DOM tests.
- **pgTAP** (extend `rls_household_access.test.sql`; bump `plan()`): anon /
  non-member denied; member CRUD; cross-household deny; `household_id` reassign
  denied; CHECK (null recipe + null title fails; invalid slot fails); trigger
  rejects cross-household `recipe_id`. Prefer **in-test inserts** for fixtures;
  keep seed `planned_meals` empty so empty-week UX is real. Seed still provides
  **Fixture Spaghetti** for recipe assign.
- **Playwright** `tests/e2e/meals.chromium.spec.ts` with serial projects
  `meals-chromium-desktop` (1280×800) and `meals-chromium-mobile-360` (360×780),
  plus `meals.webkit.spec.ts` on iPhone/iPad WebKit projects (extend
  `testMatch` — filename-specific config skips new files otherwise). Flows:
  empty week → assign Fixture Spaghetti with unique notes → edit notes →
  delete (cancel + confirm) → week nav isolation → no horizontal scroll at 360.
  Unique notes/`Date.now()`; never assert global meal counts.

#### Acceptance criteria

- [x] Week-first planner at `/meals` with prev/next/This week; default = current
      week; invalid `?week=` falls back safely; mid-week dates canonicalize to Sunday.
- [x] Days expose Breakfast, Lunch, Dinner, Snacks; multiple snacks allowed.
- [x] Assign recipe or custom title; optional servings + notes persist after reload.
- [x] Edit can change day/slot; date strings have no timezone off-by-one.
- [x] Delete confirms; cancel keeps the meal; confirm hard-deletes and stays gone.
- [x] Mutations Zod-validated; submit disabled while saving; recoverable errors
      preserve input; no hover-only required actions.
- [x] Usable at 360×780, 390×844, iPad portrait, desktop ≥1280; no horizontal
      scroll at 360; ≥44px touch targets; keyboard-reachable actions with focus.
- [x] Vitest + pgTAP + Playwright (desktop + 360 + WebKit smoke) green;
      `npm run verify` and `npm run test:db` pass.
- [x] No grocery generation, leftovers, or recurring APIs/UI in this slice.

#### Risks (accepted)

1. **Week start:** Sunday (household preference). Grocery must share `weekStartOn`.
2. **Multiple meals per B/L/D:** Allowed; UI stacks chips.
3. **Drag-and-drop:** Deferred; menus + forms only.
4. **Title snapshot:** `custom_title` always set; survives recipe archive/delete.
5. **Concurrent edits:** Last-write-wins; no version token.
6. **`ResponsiveFormShell`:** Still under `components/budget/` (shared reuse).

#### Verification gate

```bash
npm run test:db
npm run verify
# Playwright includes meals assign/edit/delete at desktop + 360
```

### 6. Shopping list

**Status:** Complete (2026-07-19; local `verify` + `test:db` green)

Week-scoped shopping list generated from the meal planner, plus manual lines.
Optimized for **in-store mobile use** (check-off, progress, collapse completed)
while remaining clear on desktop. Reuses Sunday `weekStartOn`, Budget/Recipes
action patterns, and existing `grocery_lists` / `grocery_list_items` (Milestone
2). No workbook sync. Route and nav label stay **Shopping** (`/shopping`).

Specialist reviews: [Frontend/UI](7ddd351a-190d-438d-8cfe-9d9ad2793dcc),
[Backend/Data](cc098ed2-e2b3-4339-a68b-c739aad48231),
[QA](03327d5b-8527-4125-9385-a086036590a0). Lead reconciled below (ADR-017).

#### In scope

- One **active** list per household per Sunday `week_start_on`; `?week=` like Meals
- **Generate / refresh** from planned meals with `recipe_id` in that week
- Scale quantities by `(planned.servings ?? recipe.servings) / recipe.servings`
- **Aggregate** by `(ingredient_id | ingredientNameKey) + normalizeUnit(unit)`
- **Normalize units** via existing `normalizeUnit` (canonical approved strings);
  **no conversion** between units in V1 (tbsp vs ml stay separate rows)
- Preserve ingredient **notes when useful** (identical notes in a merge bucket
  keep that note; conflicting notes → empty)
- Manual add / edit / delete; check/uncheck any item; delete any item;
  **clear checked** (bulk delete checked rows)
- Regenerate reconciles by `generation_key` (idempotent; manuals untouched;
  matching checked state preserved; no duplicate buckets)
- Soft group by `store_section` when non-empty (inherit from ingredients on
  generate); else single “List” group — not aisle routing
- Collapse completed items (default: checked collapsed under “Checked (N)”)
- Shopping progress: “N of M” (+ thin bar); not color-only
- Empty / loading / error / validation; household-friendly copy only

#### Out of scope (future extension points only)

| Deferred                         | Leave room by                                            | Avoid now                                    |
| -------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| Pantry inventory / subtraction   | Later `pantry_items` table; generate stays meal-driven   | Auto-subtract or pantry UI                   |
| Unit conversion (cup↔ml, etc.)   | Aggregation key stays unit-aware; convert helper later   | Conversion tables / fuzzy merge              |
| Price / coupons / barcode        | Keep `quantity`/`unit` only                              | Price columns, scanner                       |
| Store organization / aisle maps  | Free-text `store_section` already on items + ingredients | Taxonomy, drag-to-aisle, multi-store routing |
| Shared live collaboration        | RLS equal read/write already                             | Realtime sync, presence                      |
| Recurring grocery items          | Manual rows + regenerate policy                          | Recurrence engine                            |
| Meals “Add to shopping list” CTA | Generate-from-week is enough for the vertical slice      | Extra Meals chrome                           |

#### Schema — migration `*_shopping_slice.sql` (ADR-017)

Tables + RLS already exist. Slice adds:

1. **`generation_key` text NULL** on `grocery_list_items` — deterministic
   identity for generated aggregation buckets (null for manual rows)
2. **Partial unique** `(list_id, generation_key) WHERE source = 'generated' AND generation_key IS NOT NULL`
3. **Partial unique** `(household_id, week_start_on) WHERE status = 'active' AND week_start_on IS NOT NULL`
4. **Trigger** `enforce_grocery_list_item_household` — item `household_id` must
   match parent list; when set, `ingredient_id` / `recipe_id` must match the
   same household
5. **RPC** `regenerate_grocery_list(p_household_id, p_week_start_on, p_items jsonb)`  
   `SECURITY INVOKER`, `SET search_path = ''`: get-or-create list for the
   **canonical Sunday** week, `SELECT … FOR UPDATE` on the list row, then
   reconcile generated rows by `generation_key` (see below). Aggregation stays
   in TypeScript (Vitest).
6. Optional: index `(list_id, source, is_checked)`
7. Regenerate types into `lib/supabase/database.types.ts`
8. No denormalized ingredients on `planned_meals`; no meal↔list junction

**`generation_key` format (domain):**  
`{ingredientId | n:{nameKey}}|{normalizeUnit(unit)}|{noteIdentity}`  
where `noteIdentity` is the normalized notes string when the merge bucket has a
single identical note, otherwise empty.

**Regenerate reconcile policy (approved — not delete-all-unchecked):**

Inside one locked transaction:

1. Get-or-create active list for Sunday `week_start_on` (reject if param is not
   already that Sunday)
2. Lock the list row (`FOR UPDATE`)
3. Never modify or delete `source = 'manual'` rows
4. For each payload bucket with `generation_key`:
   - if a generated row with that key exists → **UPDATE** quantity, unit, notes,
     store_section, name, ingredient_id (etc.); **preserve `is_checked`**
   - else → **INSERT** generated row, `is_checked = false`
5. Generated rows whose key is **absent** from the payload:
   - if **unchecked** → **DELETE**
   - if **checked** → **KEEP** as completed historical (no new duplicate for that
     key because unique + upsert handles reappearance)
6. Two refreshes with unchanged inputs → identical DB state (idempotent)

RPC also rejects cross-household ingredient ids in the payload (trigger +
explicit checks).

#### Domain — `lib/domain/shopping.ts`

Reuse: `weekStartOn` / `resolveWeekStartParam` / `formatWeekLabel` (meal-plan),
`isoDateSchema` (dates), `ingredientNameKey` / `normalizeUnit` /
`optionalQuantitySchema` (recipe).

- Zod: `groceryListSchema`, `groceryListItemSchema`,
  `createManualItemInputSchema`, `updateGroceryItemInputSchema`,
  `setItemCheckedInputSchema`
- Pure: `scaleLineQuantity`, `buildAggregationInputsFromMeals`,
  `aggregateGroceryLines`, `buildGenerationKey`, `compareGroceryItems`
- Aggregation details:
  - Key: `{ingredientId|n:nameKey}|{normalizeUnit(unit)}|{noteIdentity}`
  - Sum scaled numeric quantities (round to 3 dp)
  - Null qty (“to taste”) merges only with other null-qty same key
  - Different units or notes → separate rows
  - `store_section` from ingredient at generate time
  - Generated `recipe_id` always null in V1 (multi-recipe aggregation)
  - Skip meals without `recipe_id`; count for UI notice
  - Archived recipes with existing rows still generate (meal still linked)

#### Repositories — `lib/repositories/shopping.ts`

Cookie SSR + `requireCurrentMembership()` only. Never admin client.

| Method                                     | Behavior                                    |
| ------------------------------------------ | ------------------------------------------- |
| `getOrCreateGroceryListForWeek(weekStart)` | Upsert-safe via unique index                |
| `getGroceryListForWeek(weekStart)`         | Nullable                                    |
| `listGroceryItems(listId)`                 | Ordered for UI                              |
| `generateGroceryListFromMeals(weekStart)`  | Load meals + recipe lines → aggregate → RPC |
| `createManualItem(listId, input)`          | `source = 'manual'`                         |
| `updateGroceryItem(id, input)`             | Manual fields; never flip `source`          |
| `setItemChecked(id, checked)`              | Any source                                  |
| `deleteGroceryItem(id)`                    | Any source                                  |
| `clearCheckedItems(listId)`                | Delete where `is_checked`                   |

#### Server actions — `app/(app)/shopping/actions.ts`

Same `{ error, success }` pattern as meals/budget; Zod at boundary;
`revalidatePath('/shopping')` after success.

| Action                      | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `generateGroceryListAction` | Generate or refresh week                  |
| `createManualItemAction`    | Add manual line                           |
| `updateGroceryItemAction`   | Edit manual (name/qty/unit/section/notes) |
| `setItemCheckedAction`      | Check / uncheck                           |
| `deleteGroceryItemAction`   | Remove one item                           |
| `clearCheckedItemsAction`   | Bulk remove checked                       |

Generated rows in V1: check / uncheck / delete only (no edit form). Qty fixes
come from regenerate after meal/recipe changes.

#### UX — mobile-first, desktop capable

Parameterize Meals `WeekNavigator` with `basePath` (`/meals` \| `/shopping`) —
do **not** fork week logic or Sunday helpers.

| Viewport        | Layout                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone 360 / 390 | Header → week nav + progress → toolbar (Add, Generate/Refresh, hide/collapse checked) → sectioned check rows (full-row tap ≥44px) → MobileNav + safe-area |
| iPad portrait   | Same single column; slightly wider toolbar                                                                                                                |
| Desktop ≥1280   | Sidebar; week nav left, actions right; Dialog forms; same list model                                                                                      |

Components under `components/shopping/`:

- `shopping-panel` — client orchestrator (toolbar, progress, sections, rows,
  regenerate/delete AlertDialogs, collapse checked)
- `shopping-item-form-dialog` — manual add/edit via `ResponsiveFormShell`

Uses shadcn **Checkbox**, **Progress**, **Collapsible**.

**Copy examples:** “Refresh list”, “3 meals without recipes — link recipes in
Meals or add items by hand.” No API/DB jargon.

#### Testing strategy

- **Vitest** `tests/unit/shopping.test.ts` (+ week helpers): Sunday
  normalization across month/year boundaries; scale; merge; unit normalize (not
  convert); null qty; `generation_key` stability; identical-note merge; Zod
- **Vitest / domain:** repeated `aggregateGroceryLines` identical outputs
  (idempotent inputs)
- **pgTAP:** member CRUD; anon/non-member deny; week unique; household trigger;
  cross-household ingredient/list reject; RPC reconcile:
  - checked matching item keeps checked + refreshes qty
  - no duplicate for checked matching key
  - manuals unchanged
  - removed unchecked generated deleted
  - second identical regenerate is idempotent
  - concurrent/repeated refresh cannot create duplicate buckets (unique)
- **Playwright** `shopping.chromium.spec.ts` (desktop + 360) +
  `shopping.webkit.spec.ts` smoke: generate → check → add manual → regenerate
  (qty refresh, checked kept, no dup) → clear checked → collapse/progress →
  week nav → no overflow at 360
- Gate: `npm run test:db` + `npm run verify`

#### Acceptance criteria

**Product**

- [x] Week-scoped list; `?week=` canonicalizes to **Sunday** like Meals (shared
      `resolveWeekStartParam` / `weekStartOn`)
- [x] Generate from recipe-linked meals; aggregation + scaling correct
- [x] Custom-title meals skipped with count notice
- [x] Manual add/edit/delete; check/uncheck; clear checked
- [x] Regenerate reconciles by `generation_key` (idempotent; no duplicate
      buckets; manuals untouched; checked state preserved on match)
- [x] Progress “N of M”; checked items collapsible (default collapsed)
- [x] Soft `store_section` groups when set; flat list otherwise
- [x] Usable at 360×780 → desktop; no horizontal scroll at 360; ≥44px targets
- [x] Household-friendly copy; loading/empty/error/saving states

**Technical**

- [x] Migration + types + RPC with list row lock; domain + repository + actions
- [x] Vitest + pgTAP + Playwright green; `verify` + `test:db` pass
- [x] No pantry, price, barcode, store routing, live collab, or recurring APIs

#### Risks (accepted)

1. **Obsolete checked generated** may linger as historical until cleared —
   by design; unique `generation_key` prevents duplicates on reappearance.
2. **No unit conversion** → same food in tbsp and ml appears as two lines.
3. **Check-off races** between two users remain last-write-wins; regenerate is
   serialized per list via `FOR UPDATE`.
4. **WeekNavigator refactor** — touch meals chrome only via `basePath` prop.

#### Verification gate

```bash
npm run test:db
npm run verify
# Playwright includes shopping generate/check/manual/regen at desktop + 360
```

#### Decisions (approved)

1. **Regenerate:** reconcile by `generation_key` (not blind delete/insert).
2. **Custom meals:** skip with count note; no reminder pseudo-lines in V1.
3. **`store_section`:** empty default; inherit from ingredients on generate;
   soft UI grouping only — not store organization.
4. **Week:** Sunday-only, shared with Meals (approval note “Monday” treated as
   typo — Meal Planning uses Sunday).

### 7. Recipe management

**Status:** Complete (2026-07-18; images + ingredient/unit pickers added post-plan, see ADR-015)

Recipe list, detail, create, edit, delete with structured ingredients, search,
and basic filtering. Desktop-first, fully usable on iPhone 12 mini (360×780),
iPhone 13 Pro (390×844), and iPad. Reuses Budget slice patterns. Plan below is
reconciled from Frontend/UI, Backend/Data, and QA specialist reviews.

#### In scope

- Recipe list with search + basic filter/sort
- Recipe detail view
- Create / edit / delete (delete = soft archive) a recipe
- Fields: name, notes (description), servings, prep time, cook time, instructions
- Structured ingredient lines: quantity, unit, ingredient name, per-line notes,
  preserved order; reuse existing ingredients instead of duplicating
- Empty, loading, error, validation, and success states
- Accessible, responsive forms and controls

#### Out of scope (deferred / other milestones)

Meal planning, automatic grocery-list generation, nutrition, recipe scraping /
URL import, AI generation, workbook import, subscriptions, dashboard summaries,
and native mobile.

Note: recipe images were originally deferred here, but were added in a follow-up
after this plan via private Supabase Storage + signed URLs, alongside an
ingredient picker (searchable combobox) and an approved-unit picker. See ADR-015
and migrations `20260718000000_recipe_images.sql` /
`20260718010000_recipe_images_private_fn.sql`.

#### Schema changes — one migration `*_recipe_slice.sql` (see ADR-014)

Tables already exist from Milestone 2 core schema; this slice adjusts them:

1. `recipes`: add `prep_time_minutes integer NULL CHECK (… >= 0)` and
   `cook_time_minutes integer NULL CHECK (… >= 0)`. Reuse existing `notes` as the
   description/notes field (no new column). Keep `servings numeric NOT NULL > 0`.
2. `ingredients`: add `name_normalized` STORED generated column
   (`regexp_replace(btrim(lower(name)), '\s+', ' ', 'g')`); replace
   `UNIQUE (household_id, name)` with `UNIQUE (household_id, name_normalized)` so
   reuse dedupes across casing/whitespace. `name` keeps the display form as typed.
3. `recipe_ingredients`: relax `quantity` to `numeric NULL CHECK (quantity IS NULL
OR quantity > 0)` so "to taste" lines are representable; keep `ingredient_id`
   NOT NULL, `unit`/`notes` text, `sort_order` for ordering. No unique on
   `(recipe_id, ingredient_id)` (an ingredient may appear twice).
4. Add trigger `enforce_recipe_ingredient_household` (mirrors
   `budget_month_limits`): a line's `household_id` must equal both its recipe and
   its ingredient household (`23514` mismatch / `23503` missing).
5. Add `save_recipe_with_ingredients(...)` — a `SECURITY INVOKER`,
   `SET search_path = ''` RPC that atomically upserts the recipe, reuses/creates
   ingredients (`ON CONFLICT (household_id, name_normalized)`), replaces the
   recipe's ordered lines, and returns the recipe id. Runs under caller RLS.
   FK indexes for the recipe tables already exist (`20260716230000_fk_indexes.sql`).
   Regenerate `lib/supabase/database.types.ts` after the migration.

#### Domain — `lib/domain/recipe.ts` (pure, unit-tested)

- Zod schemas: `recipeSchema`, `recipeIngredientSchema`, `recipeWithIngredientsSchema`,
  `createRecipeInputSchema`, `updateRecipeInputSchema` (extends create with `id`),
  and an `ingredientLineInputSchema` (name required/trimmed, `quantity` positive or
  null, `unit` string, `notes` string).
- Invariants: name required (trimmed, non-empty); `servings > 0`; times are
  non-negative integers or null; ingredient lines carry a resolved name and
  positive-or-null quantity; ordering preserved via contiguous `sort_order`.
- Pure helpers: `normalizeIngredientName` (trim + collapse internal whitespace;
  lowercase compare key that matches the DB generated column), `normalizeUnit`
  (trim + lowercase), `parseQuantityInput` (accepts decimals and simple `a/b`
  fractions → positive number, or null for blank/"to taste"), `formatQuantity`,
  `totalTimeMinutes(prep, cook)`, `formatDuration(minutes)`, `reindexSortOrder`.
- Row→domain mappers exported as pure functions and unit-tested.

#### Repositories — `lib/repositories/recipes.ts` (cookie SSR client + RLS)

Never the admin client. All call `requireCurrentMembership()`.

- `listRecipes({ search?, sort? })`: active (non-archived) recipe summaries
  (id, name, servings, times, ingredient count); `ILIKE` on name (+ ingredient
  name) when searching.
- `getRecipe(id)`: recipe + ordered ingredient lines (join to `ingredients`),
  scoped to the household; returns null when missing/archived.
- `createRecipe(input)` / `updateRecipe(input)`: call the
  `save_recipe_with_ingredients` RPC (atomic reuse + reorder).
- `archiveRecipe(id)`: sets `archived_at` (the "delete").

#### Server actions — `app/(app)/recipes/actions.ts`

`{ error, success }` state pattern like Budget. `createRecipeAction`,
`updateRecipeAction`, `deleteRecipeAction`. Ingredient rows arrive as a hidden
JSON field, parsed with Zod. Validate → call repo → `revalidatePath("/recipes")`
(and the detail path on edit). Submit disabled while pending; recoverable errors
return a message without discarding input.

#### UI structure

- `app/(app)/recipes/page.tsx` (RSC): reads `?q=`/`?sort=`, calls `listRecipes`,
  renders `RecipeListPanel`. Distinct **empty** ("No recipes yet" + Add CTA) vs
  **no-results** ("No recipes match …" + Clear search).
- `app/(app)/recipes/[id]/page.tsx` (RSC): `getRecipe` or `notFound()`; shows
  name, servings, prep/cook/total time, notes, instructions (line breaks
  preserved), ordered ingredients, Edit + Delete.
- `components/recipes/`:
  - `recipe-list-panel.tsx` (client): search input (debounced,
    `router.replace(url, { scroll:false })` inside `useTransition` so the shared
    route-group skeleton does not flash and focus is kept), Add button, responsive
    `ul.divide-y` list (not a table); metadata line "4 servings · 45 min total".
  - `recipe-form-dialog.tsx` (client): reuses `ResponsiveFormShell` with a new
    optional width prop (widen desktop Dialog to `sm:max-w-lg`; do **not** change
    Budget's width). Fields: name, notes, servings, prep, cook, instructions
    (Textarea), and the ingredient editor.
  - `ingredient-rows.tsx` (client): **controlled** `useState` rows keyed by a
    stable `crypto.randomUUID()` clientId; serialized to a hidden JSON input. At
    360px each row stacks (quantity + unit, then full-width name, then ↑/↓/remove
    44×44 icon buttons); single flex row at `sm+`. Reorder via up/down buttons
    (aria-labelled, disabled at ends, focus retained). Unit + ingredient
    suggestions via native `<datalist>` seeded from existing ingredients (no
    combobox dependency). The form is keyed only on dialog `open` and is **not**
    remounted/refreshed on a recoverable error, so entered rows survive; reset and
    `router.refresh()` happen only on success.
  - `delete-recipe-dialog.tsx` (client): `AlertDialog` confirm (Budget pattern).
- New shadcn component: `textarea` (only addition). Every input keeps `min-h-11`
  and 16px text (avoid iOS zoom). Dynamic-row inputs get accessible names.

#### Ingredient-entry UX

Rows of quantity | unit | name (+ optional notes). On save, each name is
normalized; an existing ingredient is reused by normalized name, otherwise created
(with `default_unit` seeded from the line). `sort_order` = row index, so order is
preserved on reload and after edits. Blank quantity ⇒ "to taste".

#### Testing strategy

- **Vitest** `tests/unit/recipe.test.ts`: normalization (name/unit), quantity
  parsing (decimals, fractions, blank→null, reject ≤0), duration/total-time,
  `reindexSortOrder` + ordering, servings/time validation, create/update Zod
  schemas, and row→domain mappers.
- **pgTAP** (extend `rls_household_access.test.sql`; bump `plan()` by ~15, 25 → ~40):
  anon denied, non-member denied, member CRUD on recipes/ingredients/
  recipe_ingredients, cross-household read/write denied, `household_id` reassign
  denied, `enforce_recipe_ingredient_household` (both recipe- and ingredient-
  mismatch, asserted under `RESET ROLE`), the `name_normalized` unique/reuse
  behavior, and the `save_recipe_with_ingredients` RPC (member success + reuse =
  single ingredients row; cross-household denial). Seed a recipe + ingredients for
  household_a and a recipe for household_b.
- **Playwright** `tests/e2e/recipes.chromium.spec.ts` with new serial projects
  `recipes-chromium-desktop` (1280×800) and `recipes-chromium-mobile-360`
  (360×780), plus a `recipes.webkit.spec.ts` reusing the iPhone/iPad WebKit
  projects (config `testMatch` is filename-specific — new projects are required).
  Flows: list shows the seeded recipe; create a uniquely-named recipe with 2
  ingredients (assert order + that reusing an existing ingredient name adds no
  duplicate); view detail; edit (rename + change a quantity + reorder, assert
  persisted order); delete/archive (assert it leaves the list, seeded recipe
  remains); search narrows the list; no horizontal scroll at 360. Create/edit/
  delete only touch test-created rows (unique `Date.now()` names) so the shared,
  non-reset local DB stays deterministic.

#### Acceptance criteria

- [ ] List shows household recipes with search + basic sort; empty and no-results
      states are distinct.
- [ ] Detail view shows name, servings, prep/cook/total time, notes, instructions
      (line breaks preserved), and ingredients in defined order.
- [ ] Create/edit/delete work; delete is a soft archive and removes the recipe
      from the list.
- [ ] Ingredient lines store quantity (positive or "to taste"), unit, and a reused
      ingredient; no duplicate `ingredients` rows for the same normalized name;
      order is preserved after edit + reload.
- [ ] Every mutation is Zod-validated; validation errors are surfaced; submit is
      disabled while saving; recoverable errors preserve entered rows; destructive
      delete confirms.
- [ ] Usable at 360×780, 390×844, iPad portrait, and desktop ≥1280; no horizontal
      scroll at 360; ≥44px touch targets; labeled, keyboard-navigable controls.
- [ ] Vitest (domain + mappers), pgTAP (RLS + trigger + RPC), and Playwright
      (desktop + 360, WebKit iPhone/iPad) all green; `npm run verify` and
      `npm run test:db` pass.

#### Risks and unresolved decisions

1. **Atomic writes:** mitigated by the `save_recipe_with_ingredients` RPC rather
   than repository-orchestrated delete-then-reinsert (which risks losing all lines
   on partial failure over PostgREST). Confirm the RPC approach is acceptable.
2. **"To taste":** proposes nullable `quantity` to satisfy the freeform-only-when-
   needed rule. If a strict positive-quantity rule is preferred instead, we keep
   `quantity NOT NULL > 0` and push "to taste" into per-line `notes`.
3. **Ingredient identity:** normalized-name dedupe is per household and case/space
   insensitive; genuinely different items that normalize alike (e.g. brand
   variants) would merge — accepted for two-user scale.
4. **Delete semantics:** soft archive (recommended) vs hard delete. Soft archive
   preserves later meal-plan/grocery references; confirm this is the intended
   "delete".
5. **Unit vocabulary:** V1 normalizes to trim+lowercase only (no alias mapping like
   tbsp↔tablespoon). Alias normalization deferred unless requested.
6. **Search scope:** name + ingredient name via `ILIKE`; no tag/category filter in
   this slice.

#### Follow-up shipped (2026-07-18): cover images + ingredient picker

- **Images:** optional recipe cover image in a private `recipe-images` Storage
  bucket (jpeg/png/webp ≤ 5 MB), household-scoped `storage.objects` RLS via
  `private.can_access_recipe_image`, `recipes.image_path` key + per-render signed
  URLs; upload in the form (preview + "remove" on edit), list thumbnails, detail
  hero. Migrations `20260718000000_recipe_images.sql` +
  `20260718010000_recipe_images_private_fn.sql` (moves the access function to the
  `private` schema per Security Advisor). See ADR-015.
- **Ingredient picker:** free-text name replaced by a searchable combobox
  (`components/recipes/ingredient-combobox.tsx` on a new `components/ui/popover.tsx`)
  listing existing ingredients with inline "Add …" and default-unit auto-fill.
- **Verified:** `npm run verify` green (28 e2e incl. upload + combobox on desktop
  - 360 + WebKit), `npm run test:db` 49/49, migrations pushed to hosted, advisors
    clean except the pre-existing Auth leaked-password warning.

### 8. Dashboard home

**Status:** Complete (2026-07-20; local `verify` + `test:db` ×2; no migrations)

Post-login home at `/dashboard` that answers **“What do I need to know and do
today?”** Summaries only — deep-link into existing modules; do not recreate
Budget, Meals, Shopping, or Recipes pages.

Specialist reviews: [Frontend/UI](4adac1b6-4868-41c4-bb4a-bd61622efbc3),
[Backend/Data](0ccb8aff-5101-4749-bffb-8f4b173133fd),
[QA](c3c4b05f-d784-4183-835a-a2ca17abe191). Lead reconciled below (ADR-018
accepted).

#### Product goals

- Immediately understandable after sign-in; prioritize **today**
- Encourage finishing unfinished work (empty today, incomplete grocery, missing
  meal days, overspend)
- Very little scrolling; calm, not a wall of equal widgets
- Desktop responsive card layout; tablet soft reflow; phone single column
- Fast load; parallel reads; no N+1; no dashboard-side mutations

#### In scope

| Card              | Shows                                                                                                      | Primary CTA                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Today**         | Shared calendar day view (household **events only** — never meals); empty until Calendar writes exist      | Open calendar → `/calendar`                  |
| **Today's meals** | Meals planned for local today (slot + title); click opens recipe when linked, else meal planner            | Open planner → `/meals?week=<currentSunday>` |
| **Budget**        | Current-month spending + remaining (`buildBudgetMonthSnapshot`); progress; **up to 3** recent transactions | View budget → `/budget` (current month)      |

Desktop: one viewport composition (`sidebar` breakpoint), no page scroll; phone
may scroll in a single column. Grocery / Recipes / Household cards were removed
from home after ship (still available via nav).

Keep accessible **h1 “Dashboard”** (`sr-only` OK) so `signInAsMember` and shell
e2e stay stable.

#### Out of scope (future extension points only)

| Deferred                   | Leave room by                                   | Avoid now                                         |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Charts / analytics         | Summary cents + counts only                     | Chart libs, sparklines                            |
| Favorites / pinning        | Recent-updated list; later `is_favorite` column | Fake favorites UI or migration                    |
| Notifications / reminders  | Card empty/attention copy                       | Push, badges, reminder engine                     |
| AI recommendations         | Deep-links into modules                         | Suggest meals/spend from model                    |
| Weather / calendar sync    | Household card stays name + count               | External APIs                                     |
| Pantry / bank integrations | Unchanged shopping + budget models              | New domains on home                               |
| Live updates / presence    | `revalidatePath` on module mutations            | Realtime subscriptions                            |
| Dashboard mutations        | Read-only + navigation                          | Generate list, add txn, plan meal dialogs on home |

#### UX — layout by breakpoint

**Canonical card order (all breakpoints):** Today → Grocery → Budget → Meal
Planning → Recipes → Household.

**Desktop (≥1280 / sidebar):**

- Row 1: Today (wider) + Grocery
- Row 2: Budget + Meal Planning
- Row 3: Recipes + Household (Household compact / quieter weight)

**Tablet (iPad portrait / below sidebar):** Single column, or Grocery|Budget as
a soft pair when both stay short. Prefer single column if cards exceed ~160px
height each.

**Phone (360 / 390):** Strict single column, same order. Target ≤ ~1.25–1.5
viewports of scroll; Today + Grocery progress above the fold when possible.
CTAs `min-h-11` (≥44px). No horizontal scroll.

**Visual hierarchy:** Today largest; Grocery/Budget medium; Recipes quiet;
Household footer-weight (still a card with name + count — not Calendar/
Subscriptions stubs).

#### Architecture

```text
app/(app)/dashboard/page.tsx          # RSC: load VM, render cards
lib/dashboard/get-dashboard-view-model.ts   # server-only composer
lib/domain/dashboard.ts               # pure VM builders + types
components/dashboard/*                # presentational cards (Card/Progress)
```

**Aggregation belongs in a thin dashboard loader + pure domain builders** — not
in feature repositories and not as snapshot math in React. Reuse existing
domain helpers (`buildBudgetMonthSnapshot`, `shoppingProgress`, `weekStartOn`,
`todayIsoDate`, `currentMonthStart`, meal sort/group).

**Migrations:** none.

**Thin repository additions (TypeScript only):**

1. Extend `listRecipes` options with `limit` + `skipImages` (or
   `listRecentRecipes({ limit })`) — **required** so the home page does not
   load/sign every recipe image.
2. `countHouseholdMembers()` on `households` repo — `select` + count for the
   current household (RLS already scopes rows).

**Reuse as-is:**

- `getCurrentMembership` / `requireCurrentMembership`
- `listPlannedMealsForWeek` (one week fetch; derive today/tomorrow/missing days
  in memory)
- `getGroceryListForWeek` + `listGroceryItems` — **never**
  `getOrCreateGroceryListForWeek` (must not create empty lists on home visit)
- `listCategories` + `listMonthLimits` + `listTransactionsForMonth` +
  `buildBudgetMonthSnapshot`

**Server actions:** no new dashboard mutations. Add
`revalidatePath("/dashboard")` alongside existing paths in budget, meals,
shopping, and recipes actions so soft navigation back home is fresh.

#### `DashboardViewModel` (proposed)

```ts
type DashboardViewModel = {
  asOf: { todayIso: string; weekStart: string; monthStart: string };
  household: { id: string; name: string; memberCount: number };
  today: {
    dateIso: string;
    meals: Array<{ id: string; title: string; mealSlot: string }>;
    tomorrowMeals: Array<{ id: string; title: string; mealSlot: string }>;
    // tomorrowMeals empty ⇒ UI omits tomorrow block
  };
  grocery: {
    weekStart: string;
    listExists: boolean;
    listId: string | null;
    checked: number;
    total: number;
    remaining: number; // total - checked
  };
  budget: {
    monthStart: string;
    actualOutCents: number;
    plannedTotalCents: number;
    remainingOutCents: number;
    recentTransactions: Array<{
      id: string;
      occurredOn: string;
      amountCents: number;
      direction: "in" | "out";
      payee: string;
      categoryName: string;
    }>; // max 3
  };
  mealWeek: {
    weekStart: string;
    mealCount: number;
    daysMissingMeals: number; // days in week with zero meals
    missingDayIsos: string[]; // optional for copy; cap display
  };
  recipes: {
    recent: Array<{ id: string; name: string }>; // max 3; no images V1
  };
};
```

**Fetch plan (after anchoring dates with injectable `now`):**

```text
Promise.all([
  requireCurrentMembership(),
  countHouseholdMembers(),
  listPlannedMealsForWeek(weekStart),
  getGroceryListForWeek(weekStart),
  listCategories(),
  listMonthLimits(monthStart),
  listTransactionsForMonth(monthStart),
  listRecipes({ sort: "recent", limit: 3, skipImages: true }),
])
→ if grocery list: listGroceryItems(list.id)
→ pure builders → DashboardViewModel
```

Approx **~8–10** queries (+ layout membership). Optional later:
`cache(getCurrentMembership)` for request dedupe. No cross-request cache of
household data.

**“Today” / week / month:** `todayIsoDate`, `currentWeekStart` (Sunday),
`currentMonthStart` — local calendar, date-only string compare. Document:
server TZ ≈ household TZ for this two-user app.

**Empty / error:** Missing list/meals/recipes are empty card states, not
errors. Hard failures → existing `app/(app)/error.tsx` (V1: fail whole page,
not per-card soft errors).

#### Accessibility

- Page `h1` “Dashboard”; each card `h2` / labelled `section`
- Real links/buttons for CTAs (no `div onClick` card shells)
- Progress: visible “N of M” + `role="status"`; bar `aria-hidden` (match Shopping)
- Remaining budget: words (“Left” / “Over by”) plus token color — not color alone
- `motion-reduce:animate-none` on dashboard skeletons
- Focus order = card order; touch targets ≥44px

#### Acceptance criteria (summary)

1. Signed-in member lands on `/dashboard` with six summary regions (not
   “Coming soon”).
2. Today shows today’s meals; tomorrow only when helpful; empty today has Plan CTA.
3. Grocery shows progress without item rows; visiting Dashboard does **not**
   create a grocery list.
4. Budget remaining/spending matches Budget page snapshot math; ≤3 recent txns.
5. Meal week shows count + days missing; CTA opens current Sunday week.
6. Recipes shows ≤3 recent names; **no** favorites UI.
7. Household shows name + member count; no management controls.
8. All primary CTAs navigate to the correct module/query.
9. 360×780: no horizontal scroll; usable with bottom nav.
10. Module mutations revalidate `/dashboard`.

#### Testing strategy

| Layer      | Plan                                                                                                                                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest     | `tests/unit/dashboard.test.ts` — pure builders (today/tomorrow, grocery null vs progress, budget trim, missing days, recipe cap, household). Inject fixed `now`. Do not re-test `buildBudgetMonthSnapshot` / `shoppingProgress` internals.                                        |
| Playwright | `dashboard.chromium.spec.ts` (+ mobile-360 project); `dashboard.webkit.spec.ts` smoke. Reuse `signInAsMember`. Assert cards/CTAs/`data-testid`s; Budget+Recipes against seed; Today/Grocery/Meal week empty or setup like shopping tests. Optional outsider household smoke once. |
| Responsive | 360, 390, iPad, desktop — checklist in QA review                                                                                                                                                                                                                                  |
| Isolation  | pgTAP remains source of truth; optional outsider e2e                                                                                                                                                                                                                              |
| Gate       | `npm run test` + `npm run test:e2e` + no `signInAsMember` regression                                                                                                                                                                                                              |

Suggested testids: `dashboard-panel`, `card-today`, `card-grocery`,
`card-budget`, `card-meals`, `card-recipes`, `card-household`, plus
`dashboard-cta-*` for primary CTAs.

#### Lead decisions (reconciled)

1. **Six cards ship together**, with Household visually demoted — not a second PR
   that drops Recipes/Household unless height slips in implementation.
2. **No favorites** in V1; recently updated recipes only; favorites = future column.
3. **Read-only home** — mutations stay on module pages.
4. **Grocery:** `getGroceryListForWeek` only.
5. **Budget:** remaining hero + up to 3 recent transactions (product), not full
   kind grid.
6. **Days missing meals** = days in the current Sunday week with zero planned
   meals (not “missing dinner”).
7. **Tomorrow** shown iff tomorrow has ≥1 meal.
8. **Fail whole page** on hard data errors in V1.
9. **Keep h1 “Dashboard”** for auth/e2e stability.
10. **No migrations.**

#### Architectural risks (pre-implementation)

| Risk                               | Mitigation                                                       |
| ---------------------------------- | ---------------------------------------------------------------- |
| Accidental `getOrCreate` on home   | Explicit ban; QA empty-list regression note                      |
| `listRecipes` signs all images     | `limit` + `skipImages` before Recipes card ships                 |
| Stale home after mutations         | `revalidatePath("/dashboard")` on module actions                 |
| Membership query amplification     | Accept for V1; optional `cache(getCurrentMembership)`            |
| Server TZ vs user near midnight    | Document; reuse `todayIsoDate` only                              |
| Widget-wall density                | Fixed order + height caps; no charts/equal icon rows             |
| Seed lacks current-week meals/list | Unit-test builders; e2e assert empty CTAs or setup like shopping |

#### Recommended improvements before code

1. Approve ADR-018 and this §8 plan.
2. Implement thin `limit`/`skipImages` (or `listRecentRecipes`) + member count
   first, then dashboard loader + cards.
3. Add `/dashboard` revalidation in the same PR as the page.
4. Do not start Subscriptions (M9) until Dashboard is approved and shipped.

### 9. Subscription tracker

**Status:** Not started (after Dashboard)

Scope (draft — plan with specialist review before code):

- Subscription list
- Add and edit subscription
- Monthly and annual conversions
- Renewal dates and status
- Calculation tests
- Reuse Budget patterns (cents, Dialog/Sheet, Zod, repositories + RLS)

### 10. Shared calendar

**Status:** Not started

Scope:

- Household event list/calendar
- Add and edit events
- Date handling
- Clear separation from meal-plan entries

### 11. Release hardening

**Status:** Not started

Scope:

- Full regression pass
- Error handling and recovery
- Accessibility review
- Responsive review
- Security review
- Deployment configuration
- Backup and recovery notes
- Production release checklist

## Architecture decisions

Record decisions here after they are made. Do not delete old decisions; mark superseded decisions clearly.

### ADR-001: Initial persistence layer

**Status:** Superseded by ADR-010  
**Decision:** Use the existing Google Sheet as the initial source of truth behind typed repository interfaces.  
**Reason:** It preserves the current household data and minimizes migration work for version 1.  
**Consequences:** The UI must never depend directly on scattered cell coordinates, and migration to a database should remain possible.

### ADR-010: Supabase as application backend

**Status:** Accepted  
**Decision:** Use Supabase Postgres as the application source of truth and Supabase Auth (email/password, no public sign-up) for the two household members. Authorize with household membership and Row Level Security. Treat the existing spreadsheet/XLSX as a one-time import source only — do not build Sheets synchronization.  
**Reason:** A normalized database with RLS fits a private two-user household app better than cell-coordinate mappings, concurrent sheet edits, and formula-dependent layouts. Auth and data live in one platform.  
**Consequences:** Milestone 3 (Google Sheets foundation) is removed as a persistence milestone and replaced by a deferred one-time import. UI continues to call repositories only. See `ARCHITECTURE.md`.

### ADR-011: Supabase key model and client boundaries

**Status:** Accepted  
**Decision:** Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (not legacy anon/service-role env names). Repositories default to the `@supabase/ssr` cookie-backed client. The secret client is restricted to provisioning/admin scripts.  
**Reason:** Matches current Supabase key guidance and keeps RLS enforced on the normal path.  
**Consequences:** Local CLI may still emit legacy JWT values; those values are copied into the new variable names. Product code must never import `lib/supabase/admin`.

### ADR-012: Auth provisioning without public registration

**Status:** Accepted  
**Decision:** Disable public sign-up. No sign-up page. Local seeds use fake users; hosted users are created via dashboard or `scripts/provision-household.ts`. Never commit real emails or production Auth UUIDs.  
**Reason:** Two trusted users; minimize attack surface.  
**Consequences:** New members require an explicit provisioning step.

### ADR-013: Budget month limits and category identity

**Status:** Accepted  
**Decision:** Persist planned amounts in `budget_month_limits` keyed by
`(category_id, month_start)` with household consistency enforced. Identify
categories by `UNIQUE (household_id, kind, name)`. Classify subscriptions with
`category_label` text (no FK to budget categories). No automatic rollover in
V1. Actuals and remaining are always derived from transactions + limits.  
**Reason:** Matches the workbook’s planned-vs-actual model without storing
spreadsheet formulas or conflating subscription labels with budget kinds.  
**Consequences:** Budget UI must upsert limits per month; a future “copy
previous month” action can populate limits without a rollover balance column.

### ADR-014: Recipe schema, ingredient reuse, atomic writes, and archival

**Status:** Accepted (2026-07-16; nullable quantity, soft archive, atomic RPC approved)  
**Decision:** For the Recipe slice: (a) add `recipes.prep_time_minutes` and
`recipes.cook_time_minutes` (nullable, non-negative) and reuse `recipes.notes`
for description; (b) dedupe ingredients per household by a STORED
`name_normalized` generated column with `UNIQUE (household_id, name_normalized)`,
replacing `UNIQUE (household_id, name)`; (c) allow `recipe_ingredients.quantity`
to be NULL ("to taste") while otherwise requiring `> 0`, preserving order via
`sort_order`; (d) enforce `recipe_ingredients` household consistency with a
trigger mirroring `budget_month_limits`; (e) perform recipe create/update through
one `SECURITY INVOKER` RPC `save_recipe_with_ingredients` so recipe, ingredient
reuse, and ordered lines commit atomically under caller RLS; (f) treat recipe
deletion as a soft archive (`archived_at`).  
**Reason:** Structured, reusable ingredients need case/whitespace-insensitive
identity; a delete-then-reinsert update over PostgREST can lose all lines on
partial failure, so an atomic RPC is safer than repository orchestration; soft
archive preserves later meal-plan/grocery references (`ON DELETE SET NULL`).  
**Consequences:** Repositories call the RPC and never the admin client; the
generated column expression must match the app's `normalizeIngredientName`; a new
migration plus regenerated types are required; pgTAP covers the trigger, the
normalized-name uniqueness, and the RPC. Alternatives (repository-orchestrated
writes with best-effort compensation; strict `quantity NOT NULL > 0`; hard delete)
are recorded in the Milestone 7 unresolved decisions.

### ADR-015: Recipe images via private Storage + signed URLs; ingredient picker

**Status:** Accepted (2026-07-18)  
**Decision:** Store optional recipe cover images in a **private** Supabase
Storage bucket `recipe-images` (5 MB cap; jpeg/png/webp). Object keys are
`"{household_id}/{uuid}.{ext}"`, so the first folder segment identifies the
owning household. `storage.objects` RLS (SELECT/INSERT/UPDATE/DELETE for
`authenticated`) is scoped to the bucket and defers to
`private.can_access_recipe_image(name)`, which parses the household folder and
calls `private.is_household_member` — kept in the `private` schema (not `public`)
so it is not exposed as a PostgREST RPC (Security Advisor). `recipes.image_path`
stores the object key; the app never persists URLs. Repositories generate
short-lived (1 hour) signed URLs per render via the authenticated client, so the
app stays private with no public image URLs and no `next/image` remote config.
The image path is written by a small guarded update **outside** the atomic
`save_recipe_with_ingredients` RPC (upload → create/update → `setRecipeImagePath`,
with best-effort object cleanup on failure), keeping "keep/replace/remove" simple
and avoiding the RPC's nullable-arg typing. The free-text ingredient name field
is replaced by a searchable combobox built on the already-installed `radix-ui`
Popover (no new dependency), listing existing household ingredients and offering
an inline "Add …" for new names, auto-filling the default unit on select.  
**Reason:** A private bucket with signed URLs matches the app's
authentication-first, two-user model and avoids leaking image URLs. Handling the
image outside the RPC keeps the atomic write untouched. Building the combobox on
Popover avoids adding `cmdk` while remaining accessible.  
**Consequences:** Renders that show images pay a batched `createSignedUrls` call;
URLs expire after an hour (regenerated each render). A rare follow-up-update
failure after upload can orphan an object (mitigated by best-effort delete).
Storage policies and the private access function are created via migration and
apply identically on local reset and hosted push. Covered by unit tests
(`validateRecipeImage`, `imageExtensionForType`), pgTAP (column + bucket exist,
cross-household storage deny), and Playwright (upload → thumbnail → hero, combobox
add + reuse).

### ADR-016: Meal planner — calendar days, week-first, hard delete

**Status:** Accepted (2026-07-18)  
**Decision:** For the Meal Planning slice: (a) keep the existing `planned_meals`
calendar-day model (`plan_date` + `meal_slot`) with no week table; (b) add
`sort_order`, a positive-or-null `servings` CHECK,
`enforce_planned_meal_recipe_household`, and require a non-empty `custom_title`
(display title / recipe name snapshot) in one migration; (c) treat week bounds
as pure domain helpers with **Sunday** week start (shared later by grocery
`week_start_on`); canonicalize `?week=` to that Sunday; (d) expose UI slots
breakfast/lunch/dinner/snack only (hide DB `other` on writes); (e) allow
multiple meals per slot; new rows (and date/slot updates) append by `sort_order`
(secondary `created_at`, `id`) — no manual reorder UI; (f) hard-delete planned
meals (recipes remain soft-archive); (g) on recipe assign, snapshot
`recipes.name` into `custom_title` so meals stay labeled after archive or
`ON DELETE SET NULL`; (h) edit day/slot via the meal form; delete via a direct
control on each tile (no duplicate/move menus).  
**Reason:** The core schema already matches a day-centric planner; Sunday matches
household preference for the week board and future grocery `week_start_on`; a
required title snapshot avoids blank meals when recipes disappear; click-to-edit
plus a clear delete control stays accessible.  
**Consequences:** Migration `20260718120000_meal_plan_slice.sql` + regenerated
types; Vitest week/date coverage (Sunday normalize, year/leap/invalid query);
pgTAP for RLS + trigger + title CHECK; Playwright `meals-*` projects including
month-boundary week nav. Grocery generation stays out of this slice but will
query `listPlannedMealsForWeek`.

### ADR-017: Shopping list — week lists, generation_key reconcile

**Status:** Accepted (2026-07-19)  
**Decision:** For the Shopping / Grocery Lists slice:

1. **Week semantics.** `grocery_lists.week_start_on` is always the **canonical
   Sunday** for that week, identical to Meal Planning. Both `/meals` and
   `/shopping` use shared `weekStartOn` / `resolveWeekStartParam` and redirect
   missing, invalid, or in-week `?week=` values to that Sunday. (Approval text
   mentioning “Monday” is treated as a typo; Postgres `date_trunc('week')` is
   Monday-based and must not drive app week bounds.)

2. **Schema.** Keep existing tables/RLS. Add `generation_key` (nullable text)
   on items; partial unique `(list_id, generation_key)` for generated rows;
   partial unique `(household_id, week_start_on)` for active lists; household-
   consistency trigger on items; `SECURITY INVOKER` RPC
   `regenerate_grocery_list`.

3. **`generation_key`.** Deterministic string from ingredient identity
   (`ingredient_id` or `n:{nameKey}`), `normalizeUnit(unit)`, and aggregation
   note identity (normalized notes when the bucket has one identical note,
   else empty). Manual rows leave `generation_key` null.

4. **Regenerate reconcile (atomic, list row locked with `FOR UPDATE`).**
   Aggregation runs in TypeScript; RPC receives the bucket payload.
   - Manual rows are never modified or deleted by regeneration.
   - Matching generated rows (same `generation_key`) are **updated**
     (quantity, unit, notes, store_section, name, ingredient refs) and
     **keep `is_checked`**.
   - New keys are **inserted** unchecked.
   - Unchecked generated keys absent from the payload are **deleted**.
   - Checked generated keys absent from the payload **remain** as completed
     historical items; the unique index prevents a duplicate when that key
     returns.
   - Two refreshes with unchanged inputs yield identical database state.

5. **RPC integrity.** `SECURITY INVOKER` so RLS applies; confirms the
   household row is visible to the caller; validates payload
   `ingredient_id`s against the household (or fails when RLS hides them);
   never updates `source = 'manual'`; requires `p_week_start_on` to be a
   Sunday (`EXTRACT(DOW) = 0`).

6. **Product.** Skip custom-title meals with a visible count notice; soft
   `store_section` grouping; no cross-unit conversion; identical-note-only
   note merge; mobile-first `/shopping`; parameterize `WeekNavigator` via
   `basePath`.

**Reason:** Blind delete-of-unchecked + insert-all creates duplicates and stale
qty on checked lines. Keyed reconcile keeps progress while refreshing amounts.
Row locks serialize concurrent regenerates. Sunday alignment avoids meal/
shopping week drift.

**Consequences:** Shopping-slice migration + types; Vitest for aggregation,
keys, and Sunday boundaries; pgTAP for unique/trigger/RPC idempotence and
cross-household deny; Playwright shopping projects. Pantry, conversion,
pricing, and aisle maps remain extension points only.

### ADR-018: Dashboard — read-only home aggregation

**Status:** Accepted (2026-07-20)  
**Decision:** For the Dashboard home slice:

1. **Role.** `/dashboard` is the post-login home that answers “What do I need to
   know and do today?” via six summary cards (Today, Grocery, Budget, Meal
   Planning, Recipes, Household). It deep-links into modules; it does not
   duplicate full pages, charts, or analytics.

2. **Read-only.** No dashboard mutations. Grocery must use
   `getGroceryListForWeek` (never `getOrCreate`). Plan/shop/spend actions open
   existing module routes.

3. **Aggregation.** A thin server-only loader
   (`lib/dashboard/get-dashboard-view-model.ts`) composes existing repositories;
   pure builders live in `lib/domain/dashboard.ts`. Feature repos stay domain-
   specific. Snapshot math stays in existing helpers
   (`buildBudgetMonthSnapshot`, `shoppingProgress`, week/date helpers).

4. **Recipes without favorites.** No `is_favorite` column. Show up to three
   recently updated recipes. Extend recipe list options with `limit` +
   `skipImages` so the home page does not sign every image. Favorites remain a
   future extension.

5. **Household.** Name + member count via a thin count query; no member
   management on this page.

6. **Freshness.** Module server actions also `revalidatePath("/dashboard")`.

7. **Schema.** No migrations for this slice.

**Reason:** Modules already expose the needed reads and domain math; a home
composer avoids N+1 UI logic and accidental write side effects while keeping
the page calm and fast.

**Consequences:** New domain/dashboard modules + presentational cards;
small recipe-list and household-count repository additions; action revalidation
updates; Vitest builders + Playwright dashboard projects. Charts, favorites,
notifications, AI, weather, pantry, bank sync, and live updates stay out of
scope.

### ADR-002: Initial client strategy

**Status:** Accepted  
**Decision:** Build a responsive web application first.  
**Reason:** It serves desktop, iPhone, and iPad with one codebase.  
**Consequences:** Native mobile development is deferred. Domain schemas and server boundaries should remain reusable.

### ADR-003: Agent orchestration

**Status:** Accepted  
**Decision:** Use one lead agent with frontend/UI, backend/data, and QA specialists.  
**Reason:** Specialized review improves quality without allowing several agents to create competing architectures.  
**Consequences:** Parallel edits require isolated worktrees and non-overlapping file ownership.

### ADR-004: Foundation scaffolding and toolchain pinning

**Status:** Accepted  
**Decision:** Scaffold with `create-next-app` using the npm `latest` Next.js tag (never preview/canary/beta/rc). Pin Node to major 24 via `.nvmrc` and `engines` `>=24 <25`.  
**Reason:** One canonical setup path; a stable release avoids churn; pinned Node prevents environment drift.  
**Consequences:** Contributors must run Node 24. Major upgrades require an explicit decision.

### ADR-005: Navigation model

**Status:** Accepted  
**Decision:** Two navigation modes from a single nav config: sidebar for desktop and iPad landscape; mobile navigation (bottom bar with 4 primary items + a "More" Sheet) for phones and iPad portrait.  
**Reason:** Seven destinations do not fit a phone bottom bar; the breakpoint split matches real device ergonomics.  
**Consequences:** Nav config is the single source of truth; both modes must stay in sync.

### ADR-006: Theming strategy

**Status:** Accepted  
**Decision:** Ship light mode only for V1 using semantic design tokens (CSS variables) mapped in Tailwind. No runtime theme switcher yet.  
**Reason:** Reduces V1 surface area while keeping a clean path to dark mode.  
**Consequences:** Components must consume tokens, not hard-coded colors, so a later theme requires no component refactor.

### ADR-007: Environment validation boundary

**Status:** Accepted  
**Decision:** Pure, dependency-free env parsing/validation (Zod) lives in `lib/config/env-schema.ts` and is unit-tested. `lib/env.ts` imports `server-only` and composes the pure parser, validating lazily at first server access.  
**Reason:** Testable pure logic, enforced server-only secret boundary, and a build that does not require secrets.  
**Consequences:** Client code can never import env; the parser is covered by unit tests including private-key `\n` normalization.

### ADR-008: Private-data and secret ignore strategy

**Status:** Accepted  
**Decision:** Ignore a dedicated `private-data/` directory plus credential file patterns and `.env*` (with `!.env.example`). Do not globally ignore `*.csv`/`*.xlsx`.  
**Reason:** Prevents accidental commits of household data and credentials without blocking legitimate fixture/sample files elsewhere.  
**Consequences:** Local spreadsheets and exports must live under `private-data/`.

### ADR-009: Test-tool division

**Status:** Accepted  
**Decision:** Vitest covers pure functions and synchronous code; Playwright covers async Server Components and complete workflows. Playwright runs Chromium (desktop + 360) and a small WebKit smoke suite for iPhone and iPad viewports.  
**Reason:** Right tool per layer; Safari/WebKit matches the real target devices.  
**Consequences:** RSC/async behavior is asserted through the production build in Playwright, not Vitest.

## Known risks

- The legacy workbook may contain formulas or layout-dependent behavior that must become explicit domain rules during the one-time import.
- Import mapping mistakes could mis-categorize money or meals; mitigate with dry-run counts and spot checks before cutover.
- RLS policy mistakes could deny legitimate members or (worse) allow cross-household access in future multi-household tests — cover with SQL/policy tests where practical.
- Supabase Auth + Netlify cookie/session wiring can be finicky on preview deploy URLs; verify redirect URLs early in M2.
- Mobile forms may need special handling for iOS keyboard and safe-area behavior.

Milestone 1 specific:

- iOS safe-area + bottom nav and `100vh`: use `100dvh` and `env(safe-area-inset-*)`; pad `<main>` so content is not obscured; test with the Safari toolbar visible.
- Seven destinations on a 360px bottom bar: mitigated by 4 primary + "More" Sheet; verify labels do not wrap at 360px.
- Build-time env validation could break `next build`/CI without secrets: validate lazily at request time; ensure build passes with only non-secret values.
- `.gitignore` swallowing `.env.example`: use `.env*` plus `!.env.example`.
- Playwright browser install (Chromium + WebKit) required on fresh machines/CI: document `npx playwright install --with-deps chromium webkit`.
- e2e flakiness / dev-vs-prod divergence: run Playwright against `build && start`, use web-first assertions, `retries: 1` in CI only.
- shadcn/Tailwind version churn: install via MCP, pin versions, commit `components.json`, re-run build after init.

Milestone 2 specific:

- Local Docker runtime: Colima + Docker CLI (Docker Desktop not required).
- Local CLI may emit legacy anon/service_role JWTs and/or publishable/secret keys — map into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`.
- Analytics disabled locally (`[analytics] enabled = false`) because the vector container cannot mount Colima’s docker.sock under virtiofs.
- Hosted Auth must have public sign-up disabled to match local `config.toml`.
- Netlify preview/production redirect URLs must allow the site origin for Supabase Auth cookies.

## Open questions

Add only questions that materially block or influence implementation.

- Resolved: email/password auth; no public sign-up (ADR-012).
- Resolved: local Supabase for M2 + hosted link support.
- Resolved: both members equal read/write in V1.
- Resolved: persistence is Supabase Postgres; spreadsheet is import-only (ADR-010).
- Resolved: hosted project linked, migrations pushed, advisors clean, public sign-up disabled.
- Resolved (Budget prep): `budget_month_limits` added; category unique
  `(household_id, kind, name)`; subscriptions use `category_label` (no budget
  FK); no V1 rollover; savings/debt are kinds with positive cents + direction.
- Resolved: Milestone 4 Budget UI approved and implemented; hosted migration
  `20260716240000` pushed; local/remote migration lists match (5).
- Resolved (Meal Planning): Sunday week start; title snapshot on
  `custom_title`; append-only `sort_order` (ADR-016 accepted).
- Resolved (Shopping plan): regenerate preserves checked generated + manuals;
  skip custom meals with count note; soft `store_section` grouping; no unit
  conversion in V1 (ADR-017 accepted).
- Resolved (Dashboard): read-only home aggregation; no favorites migration;
  `limit`/`skipImages` for recent recipes; member count query; no dashboard
  writes; `revalidateModuleAndDashboard` helper (ADR-018 accepted).

## Work log

Add newest entries first.

### 2026-07-20 (Milestone 8 Dashboard final release review)

- Work completed: Release review for Dashboard. Architecture/responsive check
  (server composer + domain builders; meals off calendar; desktop viewport lock).
  Removed temporary placeholder calendar events from production paths. Added
  `20260720193000_service_role_table_grants` so secret-key admin helpers can DML
  (pushed to hosted). Ignored `.tmp/` for lint/git.
- Files or areas changed: Dashboard slice + calendar day agenda UI; service_role
  grants migration; docs; tests; this log.
- Validation performed: `npm run test:db` 82/82 twice (no reset); `npm run verify`
  green (unit 115; e2e 62); migration list local==remote (12); advisors: Auth
  leaked-password WARN only (pre-existing); Performance: none.
- Decisions made: Release **go** for Dashboard; next is Milestone 9 Subscriptions
  (not started until planned).
- Remaining issues: Auth leaked-password protection (hosted dashboard setting);
  calendar events empty until Calendar milestone.
- Next recommended task: Commit/push; plan Milestone 9 when asked.

### 2026-07-20 (Dashboard UX — calendar day + today's meals)

- Work completed: Today panel uses shared `CalendarDayView` (events only, not
  meals). Meal Planning card lists meals planned for today with links to
  recipes. Desktop app shell locks to viewport height so Dashboard does not
  page-scroll. Calendar route reuses the same day view. Events remain empty
  until Calendar milestone writes.
- Files or areas changed: `lib/domain/calendar.ts`, `lib/domain/dashboard.ts`,
  `lib/dashboard/get-dashboard-view-model.ts`, `components/calendar/day-view.tsx`,
  `components/dashboard/*`, `app/(app)/layout.tsx`, `app/(app)/dashboard/*`,
  `app/(app)/calendar/page.tsx`, unit + e2e dashboard tests, `IMPLEMENTATION.md`.
- Validation performed: typecheck; vitest dashboard 17/17; Playwright dashboard
  chromium + webkit 12/12 (`PW_REUSE_SERVER=1`).
- Decisions made: Meals never appear on the calendar grid; Dashboard Today CTA
  → `/calendar`.
- Remaining issues: No `calendar_events` table yet (empty day is expected).
- Next recommended task: Commit when asked; Milestone 9 Subscriptions when asked.

### 2026-07-20 (Ship Milestone 8 Dashboard)

- Work completed: Implemented read-only Dashboard home (six cards), domain
  builders, server composer, recipe `limit`/`skipImages`, member count,
  centralized `/dashboard` revalidation, Vitest + Playwright (chromium +
  webkit). No migrations.
- Files or areas changed: `lib/domain/dashboard.ts`,
  `lib/dashboard/*`, `components/dashboard/*`, `app/(app)/dashboard/*`,
  repositories (recipes, households), module `actions.ts`, e2e/unit tests,
  `playwright.config.ts`, `IMPLEMENTATION.md` / `ARCHITECTURE.md` / ADR-018.
- Validation performed: `npm run verify` 64/64 e2e; unit 114; `test:db` 82/82
  twice; migration list local==remote (11); advisors: Auth leaked-password WARN
  only (pre-existing); Performance: no findings.
- Decisions made: ADR-018 accepted; Milestone 8 complete; next is Milestone 9
  Subscriptions (not started).
- Remaining issues: Auth leaked-password protection (hosted dashboard);
  membership query still re-runs per repo call (optional `cache()` later);
  Shopping `getOrCreate` on `/shopping` visit unchanged.
- Next recommended task: Optional commit; plan Milestone 9 when asked.

### 2026-07-19 (Dashboard plan — specialist review + reconcile)

- Work completed: Lead coordinated Frontend/UI, Backend/Data, and QA reviews for
  the Dashboard home vertical slice. Reconciled into Milestone 8 plan + ADR-018
  (proposed). Updated `IMPLEMENTATION.md` and `ARCHITECTURE.md`. No application
  code.
- Files or areas changed: `IMPLEMENTATION.md` (§8 Dashboard, ADR-018, roadmap
  renumber Subscriptions→9 / Calendar→10 / Release→11, work log),
  `ARCHITECTURE.md` (dashboard aggregation note).
- Validation performed: architecture + repository inventory review only (no
  lint/test run — docs-only).
- Decisions made: six-card read-only home; Today prioritizes fold; Grocery never
  `getOrCreate`; Budget remaining + ≤3 recent txns; Recipes = recent updated
  (no favorites); days missing = zero-meal days in Sunday week; fail whole page
  on hard errors; keep h1 “Dashboard”; no migrations; await approval before code.
- Remaining issues: none for the plan itself; Auth leaked-password protection
  (hosted) remains from prior milestones.
- Next recommended task: User approval of §8 / ADR-018, then implement Dashboard.

### 2026-07-19 (Milestone 6 final release review)

- Work completed: Release review only (no feature work). Confirmed Sunday week
  semantics (not Monday), `generation_key` reconcile, uniqueness/locks/RLS,
  mobile check-off UX, WeekNavigator reuse. Ran `test:db` ×2 (no reset between),
  clean `verify` after local seed reset, hosted migration parity, advisors.
- Files or areas changed: `IMPLEMENTATION.md` (this log only).
- Validation performed: `npm run test:db` 82/82 twice; `npm run verify` 50/50
  e2e; local/remote migrations include `20260720012556`; Security Advisor: Auth
  leaked-password WARN only; Performance Advisor: 0 findings.
- Decisions made: Release **go** for Shopping; checklist “Monday week” is
  incorrect vs ADR-016/017 (Sunday). Do not start Dashboard/Subscriptions until
  asked.
- Remaining issues: Auth leaked-password protection (dashboard); empty list
  created on Shopping page visit (`getOrCreate`); checked historical orphans
  until Clear checked.
- Next recommended task: Optional commit of this log; plan Milestone 8 when asked.

### 2026-07-19 (Ship Milestone 6 + advance to Subscriptions)

- Work completed: User approved Shopping slice; commit/push to `main`; push
  `20260720012556_shopping_slice` to hosted; roadmap advanced to Milestone 8
  (Subscription tracker) — not started until planned.
- Files or areas changed: full shopping vertical slice + docs; this log /
  current milestone.
- Validation performed: prior `verify` + `test:db` green for M6.
- Decisions made: M6 closed; do not start Subscriptions until asked to plan.
- Remaining issues: Auth leaked-password protection (pre-existing).
- Next recommended task: Plan Milestone 8 (Subscriptions) when ready.

### 2026-07-19 (Milestone 6 Shopping slice shipped locally)

- Work completed: Implemented Grocery Lists with `generation_key` reconcile RPC,
  Sunday week nav shared with Meals, mobile-first `/shopping` UI, Vitest/
  pgTAP/Playwright coverage. ADR-017 accepted with approval corrections.
- Files or areas changed: migration `20260720012556_shopping_slice.sql`;
  `lib/domain/shopping.ts`; `lib/repositories/shopping.ts`;
  `app/(app)/shopping/*`; `components/shopping/*`; WeekNavigator `basePath`;
  shadcn checkbox/progress/collapsible; e2e + unit + pgTAP; docs.
- Validation performed: `npm run test:db` (82); `npm run verify` (50 e2e
  including shopping desktop/360/WebKit).
- Decisions made: Sunday week (not Monday); reconcile-by-key regenerate;
  advisory + `FOR UPDATE` serialization.
- Remaining issues: Push `20260720012556_shopping_slice` to hosted Supabase
  before production shopping use; Auth leaked-password protection (pre-existing).
- Next recommended task: Hosted migration push + advisors; then next milestone
  when asked (do not start until requested).

### 2026-07-19 (Milestone 6 approved — generation_key reconcile)

- Work completed: User approved M6 with corrections: Sunday week semantics;
  `generation_key` reconcile (not blind delete/insert); list-row lock in RPC;
  expanded tests. Docs updated; implementation started.
- Files or areas changed: `IMPLEMENTATION.md` (§6, ADR-017 accepted),
  `ARCHITECTURE.md`, then shopping slice code.
- Decisions made: ADR-017 accepted; “canonical Monday” in approval text treated
  as typo → Sunday (matches Meals).
- Next recommended task: Complete Shopping implementation + verify gate.

### 2026-07-19 (Milestone 6 Shopping plan — specialist review + reconcile)

- Work completed: Lead coordinated Frontend/UI, Backend/Data, and QA reviews
  for the Grocery Lists vertical slice; reconciled into one plan. Updated
  `IMPLEMENTATION.md` §6, ADR-017 (proposed), and `ARCHITECTURE.md` grocery
  notes. No application code.
- Files or areas changed: `IMPLEMENTATION.md`, `ARCHITECTURE.md`.
- Validation performed: schema/repo/UI pattern inspection against meals +
  core grocery tables; specialist reviews reconciled.
- Decisions made (pending user approval): partial unique + household trigger +
  regenerate RPC; aggregation in domain TS; preserve checked-generated; skip
  custom meals; soft section grouping; parameterize WeekNavigator; mobile-first
  progress + collapse completed.
- Remaining issues: User approval before implementation; Auth leaked-password
  protection (pre-existing dashboard setting).
- Next recommended task: Approve or adjust M6 plan → implement Shopping slice.

### 2026-07-19 (Ship Milestone 5 + prepare Milestone 6)

- Work completed: Committed Weekly Meal Planner slice; pushed
  `20260718120000_meal_plan_slice` to hosted Supabase; pushed `main` for
  Netlify production (`jella-home.netlify.app`). Drafted Milestone 6 Shopping
  list plan (schema reuse, generate/aggregate, open questions).
- Files or areas changed: full meals vertical slice + docs; this log /
  Milestone 6 draft.
- Validation performed: prior meals unit/e2e green; hosted migration list
  includes `20260718120000` after push.
- Decisions made: Ship M5 as-is; M6 planning defaults proposed pending user
  answers on regenerate / custom-title meals / store sections.
- Remaining issues: Confirm M6 open questions; Auth leaked-password protection
  (dashboard, pre-existing).
- Next recommended task: Approve or adjust M6 plan → implement Shopping slice.

### 2026-07-19 (Milestone 5 approved)

- Work completed: User approved the Weekly Meal Planner milestone (Image Week
  Board, Sunday weeks, multi-day create, click-to-edit + compact delete; no
  duplicate/move). Roadmap advanced to Milestone 6 (Shopping list) — not started.
- Files or areas changed: `IMPLEMENTATION.md` (current milestone, M5 status,
  this log).
- Validation performed: prior meals unit + e2e already green for this slice.
- Decisions made: Milestone 5 closed; do not start Shopping until asked.
- Remaining issues: Push meal-plan migration to hosted before production meal
  use (pre-existing); Auth leaked-password protection (pre-existing).
- Next recommended task: Milestone 6 (Shopping list) when ready — plan first.

### 2026-07-19 (Meals UI fixes — day deselect + recipe combobox)

- Work completed: Allowed clearing the last selected day in the add-meal day
  picker (empty selection + clear copy; submit stays disabled). Replaced the
  Radix Popover recipe combobox with a stable absolute dropdown to stop
  focus/open flashing.
- Files or areas changed: `components/meals/{meal-form-dialog,recipe-combobox}.tsx`,
  `app/(app)/meals/page.tsx` comment, this log.
- Validation performed: unit meal-plan tests + meals Playwright.
- Decisions made: Combobox uses in-place list (no Popover) for reliable focus.
- Remaining issues: none for these bugs.
- Next recommended task: Grocery (M6) when asked.

### 2026-07-19 (Sunday week start)

- Work completed: Switched meal-plan week helpers and UI to Sunday–Saturday;
  updated ADR-016 / Architecture notes; Vitest + Playwright expectations.
- Files or areas changed: `lib/domain/meal-plan.ts`,
  `components/meals/meal-form-dialog.tsx`, `tests/unit/meal-plan.test.ts`,
  `tests/e2e/meals.chromium.spec.ts`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`.
- Validation performed: unit + meals e2e (see verify run).
- Decisions made: Sunday first day of week (overrides prior Monday ADR wording).
- Remaining issues: none for week-start.
- Next recommended task: Grocery (M6) when asked — share `weekStartOn`.

### 2026-07-19 (Meals Image Week Board — presentation redesign)

- Work completed: Replaced the slot×day spreadsheet planner with the approved
  **Image Week Board**: seven day columns of image-forward meal tiles on
  desktop/tablet; vertical day spine on phone. Summary chips (meals / open days /
  repeats); single “Plan a meal” CTA; quiet per-day add; servings hidden when 2;
  notes as icon; actions quiet at rest. No schema/repository/action changes.
- Files or areas changed: `components/meals/{meals-panel,meal-chip,week-navigator}.tsx`,
  `app/(app)/meals/page.tsx`, `tests/e2e/meals.chromium.spec.ts`, this log.
- Validation performed: `npm run verify` green (78 unit, 42 e2e).
- Decisions made: Day-centric image board over Connected Week list; dashboard
  scanning over calendar chrome.
- Remaining issues: Hosted meal-plan migration push (pre-existing).
- Next recommended task: Verify + push hosted migration when ready; Grocery (M6)
  when asked.

### 2026-07-18 (Meal Planning UX polish — presentation only)

- Work completed: Calmed the `/meals` week planner without schema, repository,
  or action changes. Quieted empty slots (ghost `+` / text instead of dashed
  cards), reduced grid borders to light row dividers, tightened spacing,
  strengthened day headers with a subtle Today accent, and elevated meal cards
  (title hierarchy, notes icon, recipe thumbnails via existing `recipes`
  `imageUrl` map). Mobile day-strip empties match the quieter pattern.
- Files or areas changed: `components/meals/meals-panel.tsx`,
  `components/meals/meal-chip.tsx`, this work-log note.
- Validation performed: `npm run verify` green (78 unit, 42 e2e).
- Decisions made: Thumbnails resolved from the page’s `RecipeSummary[]` prop
  (no meal-plan API change). Desktop empties use compact icon-only controls
  with full `aria-label`s.
- Remaining issues: Hosted meal-plan migration still needs push before
  production use (pre-existing).
- Next recommended task: Push meal-plan migration to hosted; Milestone 6
  (Shopping) when asked — not started.

### 2026-07-18 (Milestone 5 Meal Planning slice implementation)

- Work completed: Implemented the approved Weekly Meal Planner with Sunday week
  start and the approved clarifications (title integrity, append-only
  `sort_order`, canonical `?week=`, recipe title snapshot). Migration
  `20260718120000_meal_plan_slice.sql`; domain `dates.ts` + `meal-plan.ts`;
  repository + server actions; responsive `/meals` UI (week grid / day strip);
  click-to-edit + hard delete confirm; Playwright + Vitest + pgTAP. Did **not**
  start Grocery Lists. (Later: removed duplicate/move UI and the ⋯ menu.)
- Files or areas changed: migration + types + seed/pgTAP, `lib/domain/{dates,
meal-plan,budget,index}.ts`, `lib/repositories/meal-plans.ts`,
  `app/(app)/meals/{page,actions}.tsx`, `components/meals/*`, Playwright meals
  projects + specs, `ARCHITECTURE.md`, `IMPLEMENTATION.md`.
- Validation performed: `npm run verify` green (78 unit, 42 e2e); `npm run
test:db` 60/60 PASS.
- Decisions made: ADR-016 accepted (Sunday week start; `custom_title` as
  required title snapshot; append-only ordering).
- Remaining issues: Push migration to hosted before production meal use; enable
  Auth leaked-password protection (pre-existing).
- Next recommended task: Push meal-plan migration to hosted + advisors; then
  Milestone 6 (Shopping list) when ready — do not start until asked.

### 2026-07-18 (Milestone 5 Meal Planning slice planning)

- Work completed: Prepared the Weekly Meal Planner vertical-slice plan (planning
  only — no application code). Reviewed existing `planned_meals` schema + RLS,
  Budget/Recipe conventions, and nav (`/meals` primary). Ran Frontend/UI,
  Backend/Data, and QA specialist reviews and reconciled them into Milestone 5
  and ADR-016.
- Files or areas changed: `IMPLEMENTATION.md` (current milestone, Milestone 5
  detail, ADR-016, this log), `ARCHITECTURE.md` (Meal plans section: sort_order,
  servings check, household trigger, week-first notes, extension points).
- Reconciled specialist findings:
  - Backend: no required structural rewrite — optional polish migration
    (`sort_order`, servings CHECK, recipe household trigger); hard delete meals;
    hide `other` on writes; week math in pure domain; seed `planned_meals` empty;
    leave grocery/leftovers/recurring as query/API extension points only.
  - Frontend: week URL + navigator; desktop 7-col grid / phone day-strip + slot
    list / iPad hybrid; `ResponsiveFormShell` for add/edit/move/duplicate;
    AlertDialog delete; no DnD as primary; always-visible meal actions; custom
    title first-class; empty week keeps structure.
  - QA: dedicated Playwright `meals-*` projects (filename-specific `testMatch`);
    unique e2e notes; Vitest week/date helpers; pgTAP RLS + CHECK + trigger;
    explicit non-goals so tests never require grocery/leftovers/recurring.
- Lead decisions: Sunday week start (confirmable); menus+forms over DnD;
  multiple snacks; hard delete; extract `lib/domain/dates.ts` for shared
  date-only helpers.
- Validation performed: None (planning only). Verification gate defined in
  Milestone 5 testing strategy.
- Decisions made: ADR-016 (proposed, pending approval).
- Remaining issues: None for week start — later confirmed as Sunday (see 2026-07-19).
- Next recommended task: On approval, implement migration + types, domain,
  repositories, server actions, UI, and tests; then `npm run test:db` and
  `npm run verify`.

### 2026-07-18 (Milestone 7 pre-commit maintenance fixes)

- Work completed: Addressed the maintenance items surfaced by the final review,
  with no product-behavior changes.
  1. Made `npm run test:db` deterministic after Playwright. The three
     member-read count assertions (recipes, ingredients, recipe_ingredients) plus
     the budget member-read counts (households, transactions, budget_month_limits)
     now scope to fixed fixture UUIDs / fixture attributes instead of a global
     `count(*)`, so rows the e2e suite writes into the same household on the shared
     local DB no longer inflate them. No destructive per-run reset was added; the
     `test:db` script is unchanged.
  2. Added migration `20260718020000_transactions_category_index.sql`
     (`transactions_category_id_idx` on `transactions(category_id)`) to resolve the
     hosted Performance Advisor's unindexed-foreign-key finding; pushed to hosted.
     The pre-existing composite `(household_id, category_id)` index does not cover
     a `category_id`-only lookup, so a dedicated index is correct.
  3. Removed the unreachable `DeleteRecipeDialog` success path
     (`onDeleted` prop + `router.refresh` fallback + the `useEffect`/`useRouter`
     imports): `deleteRecipeAction` redirects server-side, so no client success
     state is ever observed. Dropped the now-unused `onDeleted` wiring in
     `recipe-detail-actions.tsx`.
  4. Simplified the one-element `Promise.all` in `app/(app)/recipes/[id]/page.tsx`
     to a direct `await listIngredientSuggestions()`.
- Files or areas changed: `supabase/tests/rls_household_access.test.sql`,
  `supabase/migrations/20260718020000_transactions_category_index.sql` (new),
  `components/recipes/delete-recipe-dialog.tsx`,
  `components/recipes/recipe-detail-actions.tsx`,
  `app/(app)/recipes/[id]/page.tsx`, `IMPLEMENTATION.md`.
- Validation performed: `npm run verify` green (format/lint/typecheck, Vitest,
  `next build`, 28/28 Playwright). `npm run test:db` run twice back-to-back with no
  reset in between — **49/49 PASS both times** against a DB the e2e suite had just
  written to. Hosted: migration `20260718020000` present in `list_migrations`;
  `transactions_category_id_idx` confirmed via `pg_indexes`; Performance Advisor no
  longer reports the unindexed FK on `transactions.category_id` (remaining
  notices are INFO-only unused-index entries, expected on a low-traffic DB).
- Remaining issues: Hosted Auth leaked-password protection is still disabled
  (dashboard toggle, project-wide — unrelated to this slice).
- Next recommended task: Commit the slice (see recommended message in the review
  report), then begin the next milestone.

### 2026-07-18 (Milestone 7 Recipe slice final release review)

- Work completed: Full release review of the Recipe slice (list/detail/CRUD,
  search, ingredient reuse + normalization, approved-unit picker, private-Storage
  images with signed URLs). Confirmed repository-pattern consistency with Budget
  (domain → repository → server action → RSC + shadcn), RLS enforcement (RPC is
  `SECURITY INVOKER`; Storage RLS routes through `private.can_access_recipe_image`),
  UI consistency (shared `ResponsiveFormShell`, `PageHeader`, `EmptyState`,
  `min-h-11` touch targets), accessibility (labelled controls, `role="alert"`
  errors, combobox keyboard nav), responsive layouts (360/390/iPad/desktop e2e),
  atomic writes (single-transaction save RPC), and soft-archive behavior. Updated
  Milestone 7 status to Complete and corrected the out-of-scope note that still
  listed recipe images as deferred (they shipped via ADR-015).
- Files or areas changed: `IMPLEMENTATION.md` (this entry, statuses, scope note).
  No product-code changes were required by the review.
- Validation performed: `npm run verify` green (format/lint/typecheck, Vitest,
  `next build`, 28/28 Playwright across chromium desktop + mobile-360 and webkit
  iPhone + iPad). `npm run test:db` 49/49 PASS on a freshly reset local DB (an
  initial run reported 3 failures — count assertions inflated because the e2e
  suite in `verify` had just written rows to the shared local DB; a `supabase db
reset` before `test:db` restored 49/49). Hosted (`ggyvfkgeudcqbozlsify`):
  `list_migrations` shows all 8 migrations incl. `recipe_slice`, `recipe_images`,
  `recipe_images_private_fn`. Security Advisor: only the pre-existing
  `auth_leaked_password_protection` WARN (Auth dashboard toggle, not code).
  Performance Advisor: INFO only — unused indexes (expected on a low-traffic DB)
  and one pre-existing unindexed FK on `transactions.category_id` (Budget slice).
- Remaining issues: `test:db` does not reset the DB first, so running it directly
  after `test:e2e` on the shared local stack yields false count-assertion failures;
  consider a reset-first `test:db` or scoping the count assertions to fixture
  UUIDs. Enable hosted Auth leaked-password protection (dashboard). Minor:
  `deleteRecipeAction` uses server-side `redirect`, so `DeleteRecipeDialog`'s
  `onDeleted`/`router.refresh` fallback paths are currently unreachable from the
  detail page.
- Next recommended task: Commit the slice (see recommended message in the review
  report), then begin the next milestone.

### 2026-07-16 (Milestone 7 Recipe slice local DB + e2e verification)

- Work completed: Brought up the local stack (Colima + Docker + Supabase),
  ran `npm run supabase:reset` (all migrations incl.
  `20260717000000_recipe_slice.sql` applied cleanly; seed loaded, so the new
  household trigger and normalized-name unique accept the fixtures), then
  regenerated `lib/supabase/database.types.ts` from the live DB (replacing the
  earlier hand-patched types). `npm run test:db` is now `43/43 PASS`. Fixed two
  issues surfaced only under real generated types / a real browser:
  1. Generated function types can't express nullable params, so the RPC's
     `p_prep_time_minutes` / `p_cook_time_minutes` are typed `number`; cast the
     nullable domain values at the two call sites in `lib/repositories/recipes.ts`
     (NULL is valid at runtime = "no time given").
  2. Delete navigation: the confirm dialog relied on a client `router.push`
     after the server action, but the action re-renders the current
     `/recipes/[id]` route which `notFound()`s once archived, unmounting the
     dialog before its effect ran (left a 404 at the detail URL). `deleteRecipeAction`
     now `redirect("/recipes")` server-side. Also made the two e2e "Name" label
     lookups `{ exact: true }` (they otherwise matched the ingredient-name field).
- Files or areas changed: `lib/supabase/database.types.ts` (regenerated),
  `lib/repositories/recipes.ts`, `app/(app)/recipes/actions.ts`,
  `tests/e2e/recipes.chromium.spec.ts`, `tests/e2e/recipes.webkit.spec.ts`.
- Validation performed: `npm run test:db` 43/43 PASS; `npm run test:e2e` 28/28
  PASS (chromium desktop + mobile-360, webkit iPhone + iPad); `npm run typecheck`,
  `npm run lint`, `npm run format:check` clean; Vitest 48/48.
- Remaining issues: Push the migration to hosted Supabase (`supabase db push`)
  before real recipe use, and re-run the Security + Performance advisors.
- Next recommended task: Commit the slice, then push the migration to hosted and
  re-run advisors.

### 2026-07-16 (Milestone 7 Recipe slice implementation)

- Work completed: Implemented the approved Recipe slice. Migration
  `20260717000000_recipe_slice.sql` adds `recipes.prep_time_minutes` /
  `cook_time_minutes`, an `ingredients.name_normalized` STORED generated column
  with `UNIQUE (household_id, name_normalized)` (replacing the old name unique),
  nullable `recipe_ingredients.quantity` (`IS NULL OR > 0`), the
  `enforce_recipe_ingredient_household` trigger, and the `SECURITY INVOKER`
  `save_recipe_with_ingredients` RPC. Added recipe domain (`lib/domain/recipe.ts`:
  schemas + pure helpers + row mappers), repository (`lib/repositories/recipes.ts`:
  `listRecipes`, `getRecipe`, `createRecipe`/`updateRecipe` via RPC,
  `archiveRecipe`, `listIngredientSuggestions`), server actions, and UI (list with
  debounced search + distinct empty/no-results, detail view, create/edit form with
  a controlled ingredient-row editor + `<datalist>` reuse, delete confirm). Added
  the shadcn `textarea`, an optional width prop on the shared `ResponsiveFormShell`,
  recipe seed rows, pgTAP recipe coverage (`plan(25)` → `plan(43)`), Playwright
  projects + `recipes.chromium.spec.ts` / `recipes.webkit.spec.ts`, and Vitest
  `recipe.test.ts`. Patched `lib/supabase/database.types.ts` to match the migration.
- Files or areas changed: `supabase/migrations/20260717000000_recipe_slice.sql`,
  `supabase/seed.sql`, `supabase/tests/rls_household_access.test.sql`,
  `lib/domain/recipe.ts`, `lib/domain/index.ts`, `lib/repositories/recipes.ts`,
  `lib/repositories/index.ts`, `lib/supabase/database.types.ts`,
  `app/(app)/recipes/{page,actions}.tsx`, `app/(app)/recipes/[id]/page.tsx`,
  `components/recipes/*`, `components/ui/textarea.tsx`,
  `components/budget/responsive-form-shell.tsx`, `tests/unit/recipe.test.ts`,
  `tests/e2e/recipes.chromium.spec.ts`, `tests/e2e/recipes.webkit.spec.ts`,
  `tests/e2e/helpers/auth.ts`, `playwright.config.ts`.
- Validation performed: `npm run typecheck` clean; `npm run lint` clean;
  `npm run format:check` clean; Vitest 48/48 (3 files); `npm run build` green
  (routes `/recipes`, `/recipes/[id]` present).
- Not yet run here (no Docker in this environment): `npm run test:db` (pgTAP,
  now `plan(43)`) and Playwright e2e (`npm run test:e2e`). Both require the local
  Colima/Docker + Supabase stack and must be run in the dev environment, along
  with `npm run supabase:reset` + `npm run supabase:types` to apply the migration
  and regenerate types (the committed types were hand-patched to match).
- Decisions made: ADR-014 accepted (nullable quantity, soft archive, atomic RPC).
- Remaining issues: Run `test:db` + e2e locally; then push the migration to hosted
  Supabase (`supabase db push`) before real recipe use, and re-run advisors.
- Next recommended task: Local `supabase db reset` + `supabase:types` + `test:db`
  - `test:e2e`; fix any drift; commit; push migration to hosted.

### 2026-07-16 (Milestone 7 Recipe slice planning)

- Work completed: Prepared the Recipe management vertical-slice plan (planning
  only — no application code). Reviewed Budget slice conventions and the existing
  `recipes` / `ingredients` / `recipe_ingredients` schema + RLS. Ran Frontend/UI,
  Backend/Data, and QA specialist reviews and reconciled them into the Milestone 7
  plan and ADR-014.
- Files or areas changed: `IMPLEMENTATION.md` (current milestone, Milestone 7
  detail, ADR-014, this log), `ARCHITECTURE.md` (Recipes section: prep/cook time,
  `name_normalized` unique, nullable quantity, household-consistency trigger,
  `save_recipe_with_ingredients` RPC, soft-archive).
- Reconciled specialist findings:
  - Backend: use a STORED `name_normalized` generated column (not a bare
    `lower(btrim(name))` index) so it matches app normalization; add an atomic
    `SECURITY INVOKER` save RPC to avoid delete-then-reinsert data loss; nullable
    `quantity` for "to taste"; trigger error codes `23514`/`23503`; soft archive is
    correct given `ON DELETE SET NULL` FKs; ILIKE needs no extra index; pgTAP
    ~25 → ~40.
  - Frontend: reuse `ResponsiveFormShell` with an added width prop (don't widen
    Budget); ingredient rows must be **controlled** state keyed only on `open` and
    not remounted on error (preserve entered rows); stack rows at 360px; up/down
    reorder + `<datalist>` (no combobox); `textarea` is the only new shadcn add;
    debounce search with `useTransition`/`router.replace` to avoid the route-group
    skeleton flash.
  - QA: new Playwright `recipes.*.spec.ts` needs its own projects (config
    `testMatch` is filename-specific) + WebKit iPhone/iPad; e2e must not mutate
    seeded rows; add explicit assertions for order preservation and ingredient
    reuse (single row / shared id); acceptance must include duplicate-submit
    disable, preserve-on-error, destructive confirm, surfaced validation, empty
    state; pure mappers alone are insufficient (cover reuse/reindex/RPC via pgTAP
    - e2e).
- Validation performed: None (planning only). Verification gate defined in the
  Milestone 7 testing strategy.
- Decisions made: ADR-014 (proposed, pending approval).
- Remaining issues: Six unresolved decisions listed under Milestone 7 (atomic RPC,
  nullable quantity vs strict positive, normalized-name identity, soft vs hard
  delete, unit aliasing, search scope). Recipe images deferred (no storage path).
- Next recommended task: On approval, implement the migration + regenerated types,
  domain, repositories, server actions, UI, and tests; then run `npm run test:db`
  and `npm run verify`.

### 2026-07-16 (Milestone 4 release review)

- Work completed: Final release review of Budget vertical slice. Fixed
  add-transaction date defaulting to the viewed month, month-limit amount
  refresh when changing category (toolbar prefill included), direction-aware
  category actuals, Dialog/Sheet hydration via `useSyncExternalStore`, create-
  category remount on open, and delete Cancel touch target. Removed unused
  `getTransaction`. Updated stale ARCHITECTURE non-goal and README verify note.
- Files or areas changed: `lib/domain/budget.ts`, budget UI components,
  `tests/unit/budget.test.ts`, `ARCHITECTURE.md`, `README.md`,
  `IMPLEMENTATION.md`, repository index.
- Validation performed: `npm run test:db` 25/25; hosted `migration list` (5
  match); Security Advisor WARN only (`auth_leaked_password_protection`);
  Performance Advisor clean; `npm run verify` green (22 unit + 16 e2e).
- Remaining issues: Hosted JWT `verify:hosted-access` still needs VERIFY_*
  credentials; Auth leaked-password protection still disabled on hosted;
  Playwright does not yet cover month nav / create category / set limit /
  overspend / empty / income (manual + unit coverage only).
- Next recommended task: Commit release-review fixes; enable Auth leaked-
  password protection; then Milestone 5 (meals) when ready.

### 2026-07-16 (Milestone 4 Budget vertical slice)

- Work completed: Hosted `db push` of `20260716240000_budget_month_limits.sql`
  verified (local == remote, 5 migrations). Implemented Budget domain, SSR/RLS
  repositories, server actions, month navigation, derived planned/actual/
  remaining + category summaries, transaction CRUD, Dialog/Sheet forms. Seeded
  Groceries expense data for e2e. Playwright budget projects (desktop + 360).
  Vitest coverage for currency, months, directions, summaries, overspend, empty.
- Files or areas changed: `lib/domain/budget.ts`, `lib/repositories/budget.ts`,
  `app/(app)/budget/page.tsx`, `app/(app)/budget/actions.ts`, `components/budget/*`, shadcn UI
  primitives, `tests/unit/budget.test.ts`, `tests/e2e/budget.chromium.spec.ts`,
  `tests/e2e/helpers/auth.ts`, `scripts/run-e2e-local.ts`,
  `scripts/start-with-local-supabase.ts`, `scripts/verify-hosted-access.ts`,
  `playwright.config.ts`, `package.json`, seed/pgTAP, `ARCHITECTURE.md`,
  `IMPLEMENTATION.md`, `docs/WORKBOOK_MAPPING.md`, types.
- Validation performed: `supabase migration list` local==remote;
  `db advisors --linked` Performance 0; Security Advisor only Auth
  `auth_leaked_password_protection` WARN (dashboard setting, not SQL);
  remote `budget_month_limits` + unique `(household_id, kind, name)` + RLS
  policy present; `npm run supabase:reset`; `npm run test:db` 25/25;
  format/lint/typecheck/unit green; `npm run test:e2e` 16/16.
- Decisions made: Totals always derived; positive cents + direction; e2e rebuilds
  Next against local Supabase keys so proxy never uses hosted `.env.local`.
- Remaining issues: Hosted JWT member/non-member recheck via
  `verify:hosted-access` needs `VERIFY_*` / provisioning credentials in env
  (not present in current `.env.local`). Auth leaked-password protection WARN
  remains until enabled in hosted Auth settings.
- Next recommended task: Commit Milestone 4 when ready; then meals / shopping
  (or enable Auth leaked-password protection + re-run hosted access verify).

### 2026-07-16 (budget schema adjustment)

- Work completed: Applied approved schema prep before Budget UI. Migration
  `20260716240000_budget_month_limits.sql` adds `budget_month_limits` (UNIQUE
  category+month, first-of-month check, household-consistency trigger, RLS),
  changes `budget_categories` unique to `(household_id, kind, name)`, replaces
  `subscriptions.category_id` with `category_label`. Updated seed + pgTAP
  (25 tests). Regenerated `lib/supabase/database.types.ts`. Drafted Milestone 4
  UI plan in this file for approval — **UI not started**.
- Files or areas changed: `supabase/migrations/20260716240000_*.sql`,
  `supabase/seed.sql`, `supabase/tests/rls_household_access.test.sql`,
  `lib/supabase/database.types.ts`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`.
- Validation performed: `npm run supabase:reset`; `npm run supabase:types`;
  `npm run test:db` 25/25 PASS; `npm run verify` green.
- Decisions made: ADR-style confirmations from user approval (no rollover; kinds
  explicit; derived actuals; deferred importer; subscription label not FK).
- Remaining issues: Hosted `db push` of new migration not run in this pass.
  Budget UI blocked on plan approval.
- Next recommended task: User approves Milestone 4 plan → implement Budget
  repos/actions/UI/tests; then push migration to hosted.

### 2026-07-16 (workbook discovery for Budget)

- Work completed: Read-only discovery of `private-data/workbook.xlsx` against
  the Milestone 2 Postgres schema. Documented budget tabs (Start, Log, Monthly
  Budget, Subscription Tracker, Back-end), formulas vs raw values, formats,
  and explicit workbook→DB mappings. No Supabase writes, no importer, no UI.
- Files or areas changed: `docs/WORKBOOK_MAPPING.md` (new), `ARCHITECTURE.md`
  (Budget section: `budget_month_limits`, unique-key note, subscription label
  note), `IMPLEMENTATION.md` (this subtask + work log).
- Validation performed: Dual openpyxl load (formulas + cached values). Private
  cell dumps left under gitignored `private-data/` only.
- Decisions made / recommendations:
  1. **Adjust schema before Budget UI** — add `budget_month_limits`
     (`category_id`, `month_start`, `limit_cents`).
  2. Prefer `UNIQUE (household_id, kind, name)` on `budget_categories`.
  3. Actuals / LEFT / subscription monthly↔annual are derived, not stored.
  4. Log column E and `Monthly Budget!B11` are `$` display helpers, not amounts.
  5. This export is sparse (few categories, almost empty Log) — re-export before
     real import.
- Remaining issues: Cleaning decisions in `WORKBOOK_MAPPING.md` need user
  confirmation (rollover, subscription category policy, uniqueness, direction
  rules for savings/debt).
- Next recommended task: Confirm cleaning decisions → ship a small migration for
  `budget_month_limits` (+ unique-key change if approved) → then implement
  Budget vertical slice UI/repos. Keep XLSX import deferred.

### 2026-07-16 (first stable commit prep)

- Work completed: Repository hygiene pass before the first public-facing git commit of the M1+M2 checkpoint. Removed unused Next.js scaffold SVGs and empty leftover directories; reinforced `.gitignore` for Supabase CLI temp state; refreshed README for clone → install → local Supabase → app → tests; aligned ARCHITECTURE app-guard wording with Next.js `proxy.ts`. No architecture or milestone work.
- Files or areas changed: `README.md`, `ARCHITECTURE.md`, `.gitignore`, `IMPLEMENTATION.md`, deleted unused `public/*.svg`, removed empty `lib/google-sheets/` and `supabase/snippets/`.
- Validation performed: `npm run verify`; `npm run test:db`; clean-install build check (documented in release summary).
- Decisions made: Keep all current npm dependencies (each referenced). Keep hosted project ref in the private decision log; do not commit secrets.
- Remaining issues: Product feature UI still placeholder-only; Netlify env may still need hosted Supabase keys if not set; validation users are `@example.test` until real members are provisioned.
- Next recommended task: Create the first stable commit, then start Milestone 4 (Budget vertical slice).

### 2026-07-16 (hosted project linked + validated)

- Work completed: Linked `ggyvfkgeudcqbozlsify` (`jella-home`, us-east-2). Pushed 4 migrations. Security Advisor initially warned that `public.is_household_member` was executable as SECURITY DEFINER via RPC — moved helper to `private` schema (migration `20260716233000`). Re-ran Security + Performance advisors: **0 findings**. Wrote hosted keys into gitignored `.env.local`. Provisioned validation household (2 members) via script; `verify:hosted-access` confirmed equal read/write and non-member denial. App auth against hosted: member sign-in + membership load OK. Hosted Auth public email sign-up disabled (`signUp` → "Signups not allowed for this instance").
- Commands/results:
  - `supabase link --project-ref ggyvfkgeudcqbozlsify` — OK
  - `supabase db push` — 4 migrations applied
  - `supabase migration list` — local == remote
  - `supabase db advisors --linked --type security|performance` — 0 / 0 after fix
  - `npm run test:db` — 17/17 PASS (local, includes private-fn migration)
  - Hosted tables present: 11 product tables
  - Access: `sameHousehold`, `equalReadWrite`, `nonMemberDenied` all true
- Decisions made: ADR-style — membership helper lives in `private` schema (not API-exposed `public`) to satisfy Security Advisor while keeping RLS working.
- Remaining issues: Validation users use `@example.test` emails — replace with real household members via provision scripts when ready (do not commit emails). Netlify env vars for hosted Supabase should be confirmed before treating the deploy as production-ready.
- Next recommended task: Superseded by first stable commit prep, then Budget vertical slice.

### 2026-07-16 (hosted validation prep + pre-prod review)

- Work completed: Lead pre-production review before hosted link. Added FK index migration (`20260716230000_fk_indexes.sql`), hosted runbook (`docs/HOSTED_SUPABASE.md`), `scripts/add-household-member.ts`, `scripts/verify-hosted-access.ts`, improved provision script (loads `.env.local`, rejects duplicate emails). Re-applied local migrations; RLS still 17/17. App `verify` green. Documented local vs hosted workflows in README/ARCHITECTURE.
- Pre-production findings (fix or accept now):
  1. **Fix now:** unindexed FKs → migration added (Performance Advisor hygiene).
  2. **Fix now / ops:** hosted Auth must disable public sign-up (dashboard); cannot be enforced only in app UI.
  3. **Accept:** `GRANT` to `anon` on tables with no anon policies — standard Data API pattern; RLS denies rows.
  4. **Accept:** Colima analytics disabled — local-only; unrelated to hosted.
  5. **Accept for V1:** `role` column does not gate permissions; both members equal via identical RLS.
  6. **Watch:** Netlify must receive `SUPABASE_SECRET_KEY` as a server-only env; never `NEXT_PUBLIC_`.
  7. **No architecture change:** repository + SSR client + admin-only provisioning remains correct.
- Blocked: `npx supabase login` cannot complete non-interactively in this agent environment (no TTY / access token). Need either:
  - user runs `npx supabase login` in a local terminal, **or**
  - user provides `SUPABASE_ACCESS_TOKEN` + hosted `project-ref` (and later provision/verify credentials via env).
- Validation performed: `npm run verify` green; `npm run test:db` 17/17 PASS after FK migration.
- Next recommended task: Authenticate CLI → create/link hosted project → `db push` → advisors → provision → `verify:hosted-access` → point `.env.local` at hosted keys.

### 2026-07-16 (local Supabase on Colima)

- Work completed: Confirmed Colima/Docker, started local Supabase, applied migrations via `db reset`, ran pgTAP RLS suite (17/17 pass), wrote gitignored `.env.local` from `supabase status`, verified seed-user sign-in + membership read against the local API. Updated `.env.example` placeholders and notes.
- Commands run:
  - `docker info` / `colima status` — OK
  - `npx supabase start` — OK after disabling analytics (see decision below)
  - `npx supabase db reset` — migrations + seed applied
  - `npm run test:db` — `Files=1, Tests=17, Result: PASS`
  - Auth/membership smoke via publishable client + seed user `member-a@example.test` — OK
- Files or areas changed: `supabase/config.toml` (analytics off for Colima), `.env.example`, `.env.local` (local only, not committed), `IMPLEMENTATION.md`.
- Validation performed: RLS pgTAP green; Auth health HTTP 200; REST HTTP 200; seed member can sign in and load membership; `.env.local` confirmed gitignored.
- Decisions made: Keep local analytics disabled under Colima to avoid the known `supabase_vector` docker.sock mount failure. Prefer Colima over Docker Desktop for this machine.
- Remaining issues / deviations: Hosted Security/Performance advisors still pending (`supabase link` + `npm run supabase:advisors`). Do not commit `.env.local`.
- Next recommended task: Link hosted project, push migrations, run advisors, provision real users with `scripts/provision-household.ts`.

### 2026-07-16 (Milestone 2 implementation)

- Work completed: Implemented approved Milestone 2 — Supabase env/clients, Next.js `proxy.ts` session gate, email/password sign-in (no sign-up), membership-gated `(app)` shell, household repository (SSR/RLS path), schema + RLS migrations, fake local seed, pgTAP RLS tests, hosted provisioning script, removed Google Sheets backend stubs. Updated architecture docs and README.
- Files or areas changed: `supabase/**`, `lib/supabase/**`, `lib/repositories/households.ts`, `lib/domain/**`, `lib/config/env-schema.ts`, `lib/env.ts`, `proxy.ts`, `app/sign-in/**`, `app/not-provisioned/**`, `app/auth/actions.ts`, `app/(app)/layout.tsx`, `components/auth/**`, `scripts/provision-household.ts`, tests, package scripts; deleted `lib/google-sheets`, `lib/config/sheets.ts`.
- Validation performed: `npm run verify` green (format, lint, typecheck, Vitest 5/5, production build, Playwright 10/10). `test:db` / advisors blocked (Docker not installed; no hosted project linked).
- Decisions made: ADR-011 (publishable/secret keys + SSR default client), ADR-012 (no public registration). Next.js 16 `proxy.ts` used instead of deprecated `middleware.ts`.
- Remaining issues / deviations: Superseded by the local Supabase on Colima entry above for DB/RLS. Hosted advisors still open.
- Next recommended task: Superseded — local stack is running; next is hosted advisors + provisioning.

### 2026-07-16 (architecture revision: Supabase)

- Work completed: Revised project architecture away from Google Sheets as source of truth. Documented normalized Postgres schema, household RLS, repository boundaries, migrations/types plan, and deferred one-time XLSX import. Updated agent/role guidance and roadmap; drafted Milestone 2 plan for approval. No application code implemented.
- Files or areas changed: `ARCHITECTURE.md` (new), `AGENTS.md`, `ROLES.md`, `IMPLEMENTATION.md`.
- Validation performed: Documentation-only review against current Milestone 1 repo (shell + Sheets stubs still on disk until M2 implementation).
- Decisions made: ADR-010 (Supabase Postgres + Auth; Sheets/XLSX import-only). ADR-001 marked superseded. Old Milestone 3 (Google Sheets foundation) replaced by deferred one-time workbook import.
- Remaining issues / deviations: Superseded by Milestone 2 implementation entry above.
- Next recommended task: Superseded by M2 implementation.

### 2026-07-16 (commit + Git-based Netlify CD)

- Work completed: Committed Milestone 1, created private GitHub repo `jbug16/Jella-Home`, pushed `main`, and connected Netlify continuous deployment from GitHub. Fixed Git builds so the Next.js runtime packages correctly (first Git deploys were `ready` but returned 404s with zero functions).
- Files or areas changed: Full M1 commit; `netlify.toml` updated to `npm run build`, Node 24, and explicit `@netlify/plugin-nextjs`.
- Validation performed: Initial Git deploys reached `ready` but served 404s with zero functions. Updated `netlify.toml` to explicitly run `@netlify/plugin-nextjs` and redeployed from GitHub; confirming live routes after that fix.
- Decisions made: Repo is private. Continuous deploy uses a Netlify deploy key + read-only GitHub deploy key because interactive Netlify GitHub App OAuth is not usable from this CLI environment.
- Remaining issues / deviations: Site is still public with no authentication - do not enter real household data until Milestone 2. Full release hardening remains Milestone 10.
- Next recommended task: Superseded by architecture revision — Milestone 2 is now Supabase Auth + Postgres foundation (plan pending approval).

- Production URL: https://jella-home.netlify.app
- GitHub: https://github.com/jbug16/Jella-Home
- Admin URL: https://app.netlify.com/projects/jella-home

### 2026-07-16 (verification + deploy)

- Work completed: Resumed after the previous thread aborted on a Cursor "Blob not found" backend error. Re-ran the full Milestone 1 verification gate against the current on-disk state to confirm nothing was left half-written by the crash, then deployed the app to Netlify for live testing at the user's request.
- Files or areas changed: Added `netlify.toml`. No product-code changes were needed; M1 was already complete on disk.
- Validation performed: Full gate green - `format:check`, `lint`, `typecheck`, Vitest (7/7), `next build` (9 routes), Playwright (8/8: Chromium desktop + 360, WebKit iPhone + iPad). Initial CLI deploy smoke passed.
- Decisions made: Initial deploy was a manual CLI production deploy while there was no Git remote. Created site `jella-home` under team "Jenna Curls".
- Remaining issues / deviations: Superseded by the commit + Git-based CD entry above.
- Next recommended task: Commit and connect GitHub continuous deployment (done).

- Production URL: https://jella-home.netlify.app
- Admin URL: https://app.netlify.com/projects/jella-home

### 2026-07-16 (implementation)

- Work completed: Implemented Milestone 1 (Project foundation) with all 11 approved revisions. Scaffolded the app via `create-next-app`, set up shadcn/ui (Radix) on Tailwind v4, built the responsive shell (sidebar + mobile nav from one nav config, shared route-group loading/error boundaries), added 7 placeholder domain pages, the split env modules (`lib/config/env-schema.ts` pure parser + server-only `lib/env.ts`), `.env.example`, `lib/` stubs, `.gitignore` with `private-data/` and credential patterns, and the Vitest + Playwright toolchains. Ran the full verification gate.
- Files or areas changed: `package.json` (scripts, engines, deps), `.nvmrc`, `tsconfig.json` (from scaffold), `next.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `playwright.config.ts`, `components.json`, `app/` (root layout, `(app)` group layout + loading + error, 7 pages, redirect home, `globals.css` tokens), `components/layout/*`, `components/common/*`, `components/ui/*` (button, separator, scroll-area, skeleton, sheet), `lib/*`, `tests/unit/env-schema.test.ts`, `tests/e2e/shell.*.spec.ts`, `.env.example`, `.gitignore`, `private-data/.gitkeep`, `README.md`.
- Validation performed: `npm run verify` passed end-to-end - Prettier `format:check`, ESLint, `tsc --noEmit`, Vitest (7/7), `next build` (9 static routes), Playwright (8/8: Chromium desktop + 360, WebKit iPhone + iPad). `git check-ignore` confirmed secrets/`private-data` are ignored, `.env.example` is tracked, and non-private CSVs are not globally ignored. `server-only` confirmed as the only reader of `process.env` for app code; no `NEXT_PUBLIC` secrets.
- Decisions made: Pinned Next.js 16.2.10 / React 19.2.4 / Tailwind v4 / Zod 4.4.3 (all npm `latest`, no preview). Custom Tailwind breakpoint `--breakpoint-sidebar: 70rem` (1120px) switches nav modes so iPad landscape gets the sidebar and iPad portrait gets mobile nav. Dark-mode token block is defined but never activated (light-only V1).
- Remaining issues / deviations: (1) shadcn `init` hung on an interactive step in this environment, so `components.json`, `lib/utils.ts`, and the token `globals.css` were authored directly and components added with `shadcn add` (Radix base). (2) Vitest scoped to pure functions only for M1, so `@testing-library/react`/`jsdom` were not installed yet (add when component tests arrive). (3) The machine disk hit 100% mid-run; reclaimed space (removed a leftover Playwright download cache) to install browsers - unrelated to app code.
- Next recommended task: Milestone 2 (Authentication and household access), using the documented `AUTH_ALLOWLIST` env var.

### 2026-07-16 (planning)

- Work completed: Prepared and finalized the Milestone 1 (Project foundation) plan. Ran Frontend/UI, Backend/Data, and QA specialist reviews and reconciled findings. Recorded the approved plan and 11 required revisions.
- Files or areas changed: `IMPLEMENTATION.md` (current milestone, acceptance criteria, approved revisions, Milestone 1 detail, ADR-004 through ADR-009, risks, this log).
- Validation performed: None yet (planning only). Verification gate defined for implementation.
- Decisions made: ADR-004 (scaffold via create-next-app, latest stable Next, Node 24 pin), ADR-005 (dual nav model), ADR-006 (light-only + semantic tokens), ADR-007 (pure env-schema + server-only env), ADR-008 (private-data dir + credential ignores), ADR-009 (Vitest vs Playwright division, WebKit smoke).
- Remaining issues: Implementation not started (blocked on mode; user will trigger code implementation separately). Open questions (auth provider, sheet write strategy, first feature) remain deferred to later milestones.
- Next recommended task: Implement Milestone 1 per the plan, then run the full `verify` gate and report.

### YYYY-MM-DD

- Work completed:
- Files or areas changed:
- Validation performed:
- Decisions made:
- Remaining issues:
- Next recommended task:
