# UI/UX polish milestone

**Status:** Complete (2026-07-23)  
**Branch:** `polish/ui-ux-milestone` → `main` (production)
**Scope:** Performance and shared-structure fixes, feature UX fixes, and mobile/keyboard polish. No new product features.

## Audit summary (before changes)

### Performance (slow page loads)

Measured via code-path analysis (request waterfalls). Dominant costs:

1. **Uncached household membership** — every repository call re-ran `getClaims` + `household_members` + `households`. Layout gated membership once; pages paid again per repo. Dashboard ≈ layout + ~8 membership chains.
2. **`force-dynamic` app layout** — expected for auth; do not add stale caches for household data.
3. **Dashboard over-fetch** — loaded **all** recipes with signed Storage URLs for a few meal thumbnails.
4. **Calendar event query** — `start_on <= rangeEnd` with no lower bound; historical series filtered only in JS.
5. **Large client panels** — secondary to TTFB; kept where interaction requires them.

### Shell / navbar

`AppHeader` rendered a sticky bar on desktop even though branding was hidden — wasted vertical space next to the sidebar.

### Icon actions

No shared `IconButton`. Lucide is the icon library. Edit/Delete were text in several panels.

### Dashboard calendar title

Awkward “Today” + uppercase eyebrow + orphan day number vs peer cards.

### Budget confusion

Four equally weighted sections repeating Planned · Actual · Remaining; empty kind cards; weak primary action hierarchy.

### Shopping warning

Persistent skipped-meals notice — remove UI only; keep skip behavior.

### Calendar selection / clipping

Prev/next week reset `day` to Sunday; `ring-1` clipped under `overflow-x-hidden`.

### Mobile / keyboard

Sheets scrolled as one block; needed flex + scrollable body with `dvh` / safe-area.

---

## Budget layout proposals

### Proposal A — Ledger-first (implemented)

Hero Remaining + Planned/Spent; categories with progress; recent activity; drop By type.

### Proposal B — Envelope / categories-first (not chosen)

Category-first drill-down — better for envelope planning, weaker for “log this purchase.”

**Decision:** Proposal A for a two-person household.

---

## Checklist

### Pass 1 — Performance and shared structure

- [x] 1. Performance: `React.cache` membership + client; Dashboard recipe images by id; calendar SQL lower bound
- [x] 2. Desktop top navbar space removed (`AppHeader` `sidebar:hidden`)
- [x] 3. Shared `IconButton`; Edit/Delete/prev/next converted where suitable
- [x] 4. Dashboard calendar title → “Today’s events” with natural date subtitle

### Pass 2 — Feature-specific UX

- [x] 5. Budget Proposal A (ledger-first)
- [x] 6. Shopping skipped-meals warning UI removed (skip behavior kept)
- [x] 7. Calendar week/month selection + URL sync + unit/e2e tests
- [x] 8. Calendar highlight clipping (inset border-2, grid padding)

### Pass 3 — Mobile polish and keyboard

- [x] ResponsiveFormShell scroll body + `dvh` / safe-area
- [x] Page header / main padding mobile polish
- [x] Touch targets via IconButton `size-11`

### Testing and ship

- [x] Playwright polish + calendar nav/Today/clipping; Budget; shopping warning; shell; icon a11y; overflow; WebKit
- [x] `npm run verify` (+ build); Playwright 132 passed
- [x] Update docs (this file + IMPLEMENTATION)
- [x] Commit → merge/push production branch
- [x] Merge/push `main` → confirm Netlify production → verify live routes

---

## Performance notes

| Item                   | Before                              | After                                                                  |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Membership per request | N × (claims + 2 queries)            | 1× via `React.cache` (same two-query shape)                            |
| Dashboard recipes      | Full list + all signed URLs         | `listRecipeCoverUrlsByIds` for today’s meals only                      |
| Calendar events SQL    | `start_on <= end` only              | Unchanged — PostgREST lower-bound attempt dropped valid rows; deferred |
| Shopping page          | Extra meals fetch for warning count | Removed (warning UI gone)                                              |

**Files changed (high level):** `lib/repositories/households.ts`, `lib/supabase/server.ts`, `lib/dashboard/get-dashboard-view-model.ts`, `lib/repositories/recipes.ts`, `lib/repositories/calendar-events.ts`, `components/layout/app-header.tsx`, `components/ui/icon-button.tsx`, `components/budget/*`, `components/calendar/*`, `components/shopping/*`, `components/budget/responsive-form-shell.tsx`, e2e/unit tests, this file (archived as `docs/archive/POLISH.md`).

**Remaining bottlenecks:** Large client panels; full recipe catalogs on Meals; first-visit query-param redirects.

---

## Remaining known issues

- Meals / Recipes still ship full recipe catalogs (with images) into client panels — out of polish scope beyond Dashboard.
- No persistent pre-production environment was retained.
