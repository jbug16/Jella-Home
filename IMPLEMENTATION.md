# Jella Home: Implementation Plan

This is the live project roadmap and decision log. Keep it current after every meaningful task or milestone. It should describe the repository as it exists now, not an aspirational document that drifts from the code.

## Status legend

- `Not started`
- `In progress`
- `Blocked`
- `Complete`

## Current milestone

**Milestone:** Project foundation  
**Status:** Complete  
**Owner:** Lead Engineer  
**Goal:** Establish the repository, development tooling, application shell, and documented architecture without implementing full product features.

Plan reviewed by the Frontend/UI, Backend/Data, and QA specialists and reconciled by the Lead. Approved with 11 required revisions (see "Approved revisions" and the plan detail under Milestone 1 below). Implemented and verified 2026-07-16.

### Acceptance criteria

- [x] Next.js project runs locally (`npm run dev`).
- [x] TypeScript strict mode is enabled; no `@ts-ignore` / `eslint-disable` in app code.
- [x] Tailwind and shadcn/ui are configured; `components.json` committed.
- [x] Base responsive shell works at desktop (1280+), iPad portrait and landscape, 390px, and 360px widths.
- [x] No horizontal scroll at 360px; touch targets >= 44x44; active nav indicated by more than color (`aria-current` + icon); skip-to-content link; one `<main>`/`<nav>`; single `<h1>` per page.
- [x] Navigation uses two modes: sidebar for desktop and iPad landscape; mobile navigation for phones and iPad portrait.
- [x] Light mode only for V1, implemented with semantic design tokens so dark mode can be added later.
- [x] Environment-variable strategy is documented; pure parser lives in `lib/config/env-schema.ts`, `lib/env.ts` is server-only, and the pure parser is unit-tested.
- [x] Secrets and local spreadsheet files are ignored by Git (dedicated private-data directory + credential file patterns; not a global CSV/XLSX ignore); `.env.example` is NOT ignored.
- [x] Lint, type checking, unit tests, production build, and e2e smoke pass via a single `verify` gate.
- [x] Playwright smoke: Chromium at desktop + 360; WebKit smoke for iPhone and iPad viewports.
- [x] `README.md` contains local setup and verification instructions.

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

### 2. Authentication and household access

**Status:** Not started

Scope:

- Private authentication
- Two-user allowlist
- Server-side authorization
- Protected routes
- Sign-out and unauthorized states

### 3. Google Sheets foundation

**Status:** Not started

Scope:

- Server-only Google authentication
- Sheet configuration module
- Low-level read/write helpers
- Repository interfaces
- Domain schemas and mapping tests
- Development fixtures or safe mock mode

### 4. Budget vertical slice

**Status:** Not started

Scope:

- Monthly summary
- Category totals
- Expense list
- Add and edit expense
- Currency-safe calculations
- Desktop and mobile presentation
- Playwright coverage

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

**Status:** Accepted  
**Decision:** Use the existing Google Sheet as the initial source of truth behind typed repository interfaces.  
**Reason:** It preserves the current household data and minimizes migration work for version 1.  
**Consequences:** The UI must never depend directly on scattered cell coordinates, and migration to a database should remain possible.

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

- The workbook may contain formulas or layout-dependent behavior that has not yet been translated into explicit domain rules.
- Concurrent edits in Google Sheets may require conflict handling.
- Manual sheet edits could break mappings unless columns and IDs are controlled.
- Mobile forms may need special handling for iOS keyboard and safe-area behavior.

Milestone 1 specific:

- iOS safe-area + bottom nav and `100vh`: use `100dvh` and `env(safe-area-inset-*)`; pad `<main>` so content is not obscured; test with the Safari toolbar visible.
- Seven destinations on a 360px bottom bar: mitigated by 4 primary + "More" Sheet; verify labels do not wrap at 360px.
- Build-time env validation could break `next build`/CI without secrets: validate lazily at request time; ensure build passes with only non-secret values.
- Google private key format in env: store quoted with escaped `\n`; the pure parser normalizes to real newlines; document the format in `.env.example`.
- `.gitignore` swallowing `.env.example`: use `.env*` plus `!.env.example`.
- Playwright browser install (Chromium + WebKit) required on fresh machines/CI: document `npx playwright install --with-deps chromium webkit`.
- e2e flakiness / dev-vs-prod divergence: run Playwright against `build && start`, use web-first assertions, `retries: 1` in CI only.
- shadcn/Tailwind version churn: install via MCP, pin versions, commit `components.json`, re-run build after init.

## Open questions

Add only questions that materially block or influence implementation.

- Which authentication provider will be used?
- Will the website write directly into the existing workbook tabs or use new app-managed data tabs?
- Which budget and meal workflow should be the first complete feature after foundation?

## Work log

Add newest entries first.

### 2026-07-16 (verification + deploy)

- Work completed: Resumed after the previous thread aborted on a Cursor "Blob not found" backend error. Re-ran the full Milestone 1 verification gate against the current on-disk state to confirm nothing was left half-written by the crash, then deployed the app to Netlify for live testing at the user's request.
- Files or areas changed: Added `netlify.toml` (`next build` / `.next`). No product-code changes were needed; M1 was already complete on disk.
- Validation performed: Full gate green - `format:check`, `lint`, `typecheck`, Vitest (7/7), `next build` (9 routes), Playwright (8/8: Chromium desktop + 360, WebKit iPhone + iPad). Post-deploy smoke: `/` 307 -> `/dashboard`, `/dashboard` and `/budget` return 200, `<title>` renders ("Dashboard | Jella Home"); Next.js server handler runs as a Netlify Function.
- Decisions made: Deployed via the Netlify CLI as a manual (non-Git) production deploy since the repo has no remote yet. Created site `jella-home` (project ID `50d77854-6a11-4ca2-b05d-2d406323bda3`) under team "Jenna Curls". Added a minimal `netlify.toml`; the Next.js runtime (`@netlify/next`) is auto-detected, so no plugin config was required. This is an early convenience deploy for testing - the full Milestone 10 deployment hardening (auth gating, env vars, backups, release checklist) is still pending and unchanged.
- Remaining issues / deviations: All Milestone 1 work (including this deploy config) remains uncommitted on `main` (only "Initial commit" exists); committing/pushing was not requested. The site is public with no authentication yet - real household data must not be entered until Milestone 2 (auth + allowlist) ships.
- Next recommended task: Commit the Milestone 1 work, then start Milestone 2 (Authentication and household access) using the documented `AUTH_ALLOWLIST` env var before entering any real data.

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
