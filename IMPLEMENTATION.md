# Jella Home: Implementation Plan

This is the live project roadmap and decision log. Keep it current after every meaningful task or milestone. It should describe the repository as it exists now, not an aspirational document that drifts from the code.

## Status legend

- `Not started`
- `In progress`
- `Blocked`
- `Complete`

## Current milestone

**Milestone:** 7 — Recipe management vertical slice  
**Status:** Complete (2026-07-18; final release review passed — verify, test:db 49/49, hosted migrations + advisors)  
**Owner:** Lead Engineer  
**Goal:** Recipe list, detail, and create/edit/delete with structured, reusable
ingredients on Supabase, plus search and responsive/accessible UI. Reuses the
Budget slice conventions (domain → repository → server action → RSC + shadcn).
No meal planning, grocery generation, nutrition, scraping, imports, or AI.

Previous: Milestone 4 (Budget vertical slice) complete and pushed — derived
totals, currency-safe cents, Dialog/Sheet forms, Playwright desktop + 360.
Milestone 2 complete (auth, RLS, hosted). The full Recipe plan reconciled from
Frontend/UI, Backend/Data, and QA specialist reviews is in
[Milestone 7 below](#7-recipe-management) and ADR-014.

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

**Status:** Not started

Scope:

- Week navigation
- Meal slots by date
- Add, edit, move, and remove planned meals
- Date-safe persistence
- Responsive desktop and mobile layouts
- Playwright coverage

### 6. Shopping list

**Status:** Not started

Scope:

- Generate items from planned meals
- Manual items
- Quantities and grouping
- Checked state
- Mobile-first shopping interaction
- Aggregation tests

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

### 8. Subscription tracker

**Status:** Not started

Scope:

- Subscription list
- Add and edit subscription
- Monthly and annual conversions
- Renewal dates and status
- Calculation tests

### 9. Shared calendar

**Status:** Not started

Scope:

- Household event list/calendar
- Add and edit events
- Date handling
- Clear separation from meal-plan entries

### 10. Release hardening

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

## Work log

Add newest entries first.

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
