# Jella Home: Implementation Plan

This is the live project roadmap and decision log. Keep it current after every meaningful task or milestone. It should describe the repository as it exists now, not an aspirational document that drifts from the code.

## Status legend

- `Not started`
- `In progress`
- `Blocked`
- `Complete`

## Current milestone

**Milestone:** 4 — Budget vertical slice  
**Status:** Complete  
**Owner:** Lead Engineer  
**Goal:** Monthly budget dashboard and transaction entry on Supabase, with
currency-safe cents math and responsive UI. No workbook import in this
milestone.

Previous: Milestone 2 complete. Workbook discovery + schema adjustment + hosted
migration push complete. Budget UI shipped on seed/empty data (XLSX import
deferred).

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
- `listTransactionsForMonth`, `getTransaction`, `createTransaction`,
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
- [x] Playwright: add + edit + delete expense on desktop and 360px mobile.
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

**Status:** Not started

Scope:

- Recipe list and search
- Recipe details
- Add and edit recipes
- Ingredients and servings
- Use recipe in meal plan

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
