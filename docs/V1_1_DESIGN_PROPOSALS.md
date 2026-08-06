# Jella Home V1.1 design proposals

**Status:** Approved and implemented
**Date:** 2026-08-05

These concepts use the existing Jella Home typography, neutral surfaces,
10–14px radii, semantic colors, 44px controls, and current page widths. Neither
concept adds a charting dependency, a new feature, or Calendar behavior.

Selected directions: the refined Budget period views documented below, Recipe
Detail Concept A (Editorial Split), normalized `recipe_steps`, and the shared
responsive form and combobox interaction system.

## Budget — original ledger with compact period switching

The implemented refinement preserves the original Overview/Transactions tabs
and monthly layout. A single fixed-width Month/Year button sits beside the Add
transaction button; the period navigator changes between months and years.

### Desktop, 1280px+

```text
Budget

          [‹]       August 2026        [›]   [Year] [+]
                   [ Overview | Transactions ]

┌──────────────┬──────────────┬──────────────┐
│ Planned      │ Spent        │ Remaining    │   Month
│ $2,400       │ $1,725       │ $675         │
└──────────────┴──────────────┴──────────────┘

┌─ Categories ──────────────────┐
│ Food              $180 left  │
│ Bills             $100 left  │
│ Savings            $95 left  │
└───────────────────────────────┘
```

Year mode keeps that frame and the same category set, but replaces monthly
limits with actual annual amounts:

```text
          [‹]          2026            [›]  [Month] [+]
                   [ Overview | Transactions ]

┌───────────┬───────────┬───────────┐
│ Spending  │ Income    │ Saved     │
│ actual    │ actual    │ actual    │
└───────────┴───────────┴───────────┘

Food            $4,210
Bills           $8,940
Savings         $2,400
Fun               $620
```

Year mode never renders planned values, progress against monthly limits, or
annualized estimates. “Spending” is actual `expense + bill`; income and savings
are separate actual flows. Every active household category remains visible,
including categories with `$0` activity for the selected year.

### Mobile, 320–390px

```text
[‹]   August 2026   [›]  [Year] [+]
[ Overview | Transactions ]

Planned       Spent       Remaining
$2,400        $1,725      $675

Categories
Food                         $420 / $600
██████████████░░░░░░                70%
...

Select Transactions to see the existing transaction list.
```

The Month and Year buttons have the same fixed width, and the page keeps one
44px toolbar row without horizontal overflow at supported phone widths.

### Why this is recommended

- Preserves the familiar monthly workflow and its Overview/Transactions tabs.
- Keeps Month and Year distinct without replacing the established layout.
- Shows annual allocation across the household's actual category set.
- Uses server-canonical URL state and needs no client chart library.

## Budget concept B — Focused review tabs

This concept keeps the current Summary/Transactions separation and places it
under the new Month/Year control. It reduces mobile page length but creates two
levels of segmented controls.

### Desktop

```text
Budget                                             + Add transaction

[ Month | Year ]          [‹] August 2026 [›]
[ Summary | Transactions ]

Summary selected                         Transactions selected
┌─ totals ─────────────────────┐          ┌─ full-width ledger ─────────┐
│ planned / spent / remaining │          │ date · category · payee     │
└─────────────────────────────┘          │ amount                      │
┌─ category rows ─────────────┐          └─────────────────────────────┘
└─────────────────────────────┘
```

### Mobile

Both segmented controls stack above the period navigator. Year Summary shows
actual flow totals and category totals; Year Transactions shows the grouped
ledger. No monthly limits appear in Year mode.

### Tradeoff

It is compact and familiar, but “Month/Year” plus “Summary/Transactions” adds
navigation noise, hides half of the answer, and creates extra state that is not
valuable in a private two-person app. It is not recommended.

## Recipe detail concept A — Editorial split (recommended)

This treats a recipe as something to read and cook from, not as a record card.
The image establishes the page, metadata stays compact, and the cooking content
gets a deliberate ingredients/instructions hierarchy.

### Desktop, 1280px+

```text
[← Recipes]                                  [Edit] [Delete]

┌──────────────────────────────────────────────────────────────┐
│                       16:9 recipe photo                      │
└──────────────────────────────────────────────────────────────┘

Weeknight tomato pasta
Notes/description, when present, in a restrained reading measure.

Prep 10 min   Cook 20 min   Total 30 min   Serves 4

Ingredients (4-column span)       Instructions (8-column span)
───────────────────────────       ─────────────────────────────
2 cups  Tomatoes                  1  Bring salted water to a boil…
200 g   Spaghetti                 2  Cook the sauce until reduced…
1 tbsp Olive oil                  3  Toss pasta with the sauce…

Notes
Substitution or serving notes, only when present.
```

The content grid starts only at desktop widths. Ingredients stay compact in the
narrow column; instructions use the wider reading column. The photo reserves its
aspect ratio before the private signed URL resolves, preventing layout shift.

### Mobile, 320–390px

```text
[← Recipes]                              [Edit] [Delete]
┌──────────────────────────────────────────────────┐
│                 recipe photo                     │
└──────────────────────────────────────────────────┘

Weeknight tomato pasta
Prep 10m · Cook 20m · Total 30m · Serves 4

Ingredients
2 cups Tomatoes
200 g Spaghetti

Instructions
1  Bring salted water to a boil…
2  Cook the sauce until reduced…
3  Toss pasta with the sauce…
```

The image is first, metadata wraps compactly, content remains single-column, and
actions stay in normal flow. There are no floating controls or nested cards.

### Why this is recommended

- Closest to the requested clean editorial direction.
- Strongest scan path on phones and most readable instruction measure on desktop.
- Reuses current typography, border, spacing, image, and icon-button primitives.
- Avoids sticky sidebars and internal scroll regions.
- Naturally omits absent instructions, notes, and time fields.

## Recipe detail concept B — Kitchen dossier

This is a materially different asymmetric composition. The photo and ingredient
list form a left dossier while the title and method lead the wider right column.

### Desktop

```text
[← Recipes]                                  [Edit] [Delete]

┌────────────── 5 columns ─────────────┐  7 columns
│ ┌──────────────────────────────────┐ │  Weeknight tomato pasta
│ │          4:3 photo              │ │  Prep · Cook · Total · Serves
│ └──────────────────────────────────┘ │
│                                      │  Instructions
│ Ingredients                          │  1  Bring water to a boil…
│ 2 cups Tomatoes                      │  2  Cook the sauce…
│ 200 g Spaghetti                      │  3  Toss and serve…
└──────────────────────────────────────┘
```

Mobile collapses to photo, title/metadata, ingredients, then instructions.

### Tradeoff

The asymmetric desktop view is distinctive and keeps ingredients close to the
photo, but it gives the hero less visual impact and tempts sticky-column behavior
that conflicts with the scrolling cleanup. It is not recommended.

## Shared interaction direction

Both recommended concepts assume these shared implementation rules:

- One neutral responsive form shell with a fixed header region, one independently
  scrollable body, and a safe-area-aware footer ordered Cancel then primary.
- Touch surfaces suppress Radix’s default input autofocus and focus the labeled
  surface/heading; desktop keyboard users retain deliberate autofocus.
- One controlled recipe/ingredient combobox behavior with semantic roles,
  `pointerdown` selection committed before blur dismissal, keyboard navigation,
  predictable Escape/outside close, and no nested focus-trap portal.
- The application keeps `<main>` as its one page scroll container. Popups add one
  body scroller only; closing a popup restores the prior page scroll state.
- A normalized `recipe_steps` table extends the existing atomic recipe save.
  Recipes with zero steps remain valid, and image/ingredient ordering is unchanged.
