# Legacy workbook → Postgres mapping

Read-only discovery of `private-data/workbook.xlsx` (exported from the household
Google Sheets workbook) and the sanitized record of the completed one-time
production migration. The application never imported or synchronized workbook
data at runtime.

Source inspection used local workbook tooling with formula and cached-value
reads. All extraction and loading code was removed after the cutover. Detailed
private cell dumps stay under `private-data/` (gitignored) and are not committed.

**Last discovery refresh:** 2026-08-05 (workbook mtime 2026-07-16 — unchanged
since prior budget-only analysis).

**Export caveat:** Budget line items and the transaction Log remain sparse in
this export (template rows dominate; **0** complete ledger rows). Recipe,
ingredient, and subscription data are populated. Re-export from Google Sheets
before any separately reviewed future budget migration.

## Import scope (Milestone: one-time migration)

| Domain                                    | Import?                  | Source sheets                                | Postgres targets                          |
| ----------------------------------------- | ------------------------ | -------------------------------------------- | ----------------------------------------- |
| Ingredients catalog                       | **Yes**                  | `Setup`                                      | `ingredients`                             |
| Recipes                                   | **Yes**                  | `Recipe Management`                          | `recipes`                                 |
| Recipe lines                              | **Yes**                  | `Recipe Management` (+ dedupe vs `data`)     | `recipe_ingredients` + `ingredients`      |
| Subscriptions                             | **Reviewed; not loaded** | `Subscription Tracker`                       | Final approved extract was empty          |
| Grocery persistent                        | **Optional / skip V1**   | `Setup` prices only if present               | — (no durable grocery master in workbook) |
| Weekly shopping checklist                 | **No**                   | `Weekly Shopping List`                       | — (derived + ephemeral `is_checked`)      |
| Meal calendar                             | **No**                   | `5-Week Meal Calendar`, `data` meal columns  | — (import later if needed)                |
| Budget categories / limits / transactions | **No** (this milestone)  | `Start`, `Back-end`, `Monthly Budget`, `Log` | — (sparse export; app is source of truth) |
| Calendar events                           | **No**                   | `Calendar`                                   | —                                         |
| Dashboard / summary / nutrition totals    | **No**                   | `Start`, `Search Recipe`, formula columns    | — (derived)                               |

There is **no** Google Sheets sync, dual write, or runtime spreadsheet access.

---

## Workbook inventory (12 sheets)

| #   | Sheet                | State      | Rows × cols (used) | Non-empty rows | Merged ranges |
| --- | -------------------- | ---------- | ------------------ | -------------- | ------------- |
| 1   | Setup                | visible    | 1000 × 15          | 46             | 6             |
| 2   | Recipe Management    | visible    | 1206 × 28          | 358            | 514           |
| 3   | 5-Week Meal Calendar | visible    | 1000 × 13          | 31             | 28            |
| 4   | Weekly Shopping List | visible    | 1000 × 11          | 47             | 54            |
| 5   | data                 | **hidden** | 1311 × 126         | 1310           | 0             |
| 6   | Start                | visible    | 1000 × 35          | 52             | 44            |
| 7   | Search Recipe        | hidden     | 1000 × 15          | 46             | 6             |
| 8   | Log                  | visible    | 3001 × 9           | 2999           | 3             |
| 9   | Monthly Budget       | visible    | 52 × 35            | 52             | 47            |
| 10  | Subscription Tracker | visible    | 1000 × 15          | 19             | 8             |
| 11  | Calendar             | hidden     | 1000 × 13          | 31             | 28            |
| 12  | Back-end             | hidden     | 1000 × 15          | 46             | 0             |

### Named ranges (budget dropdowns only)

| Name       | Range             | Maps to `budget_categories.kind` |
| ---------- | ----------------- | -------------------------------- |
| `Income`   | `Back-end!B3:B37` | `income`                         |
| `Bills`    | `Back-end!C3:C37` | `bill`                           |
| `Expenses` | `Back-end!D3:D37` | `expense`                        |
| `Savings`  | `Back-end!E3:E37` | `savings`                        |
| `Debt`     | `Back-end!F3:F37` | `debt`                           |

Lists mirror **Start** columns under each kind header. Cached export: **Citi**
(income), **Hotel Room** (bill); Expenses / Savings / Debt lists empty.

### Hidden rows / columns

No systematically hidden rows on import-target sheets. Column **A** on
`Recipe Management` repeats recipe names for layout/spill formulas — not a
second data source.

### Images / attachments

`Recipe Management` contains 12 embedded JPEG recipe photos anchored to the 12
imported recipe blocks. Those high-confidence mappings were recovered to the
private `recipe-images` bucket after the row import. Four embedded PNG chart
images from budget/summary sheets were identified as decorative and excluded.

---

## Sheet: Setup (ingredient catalog)

| Item                     | Detail                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Used range               | `A1:O1000`; catalog `F10:N1002`                                                      |
| Headers row 9            | `F=ITEM`, `G=CATEGORY`, `H=CAL`, `I=P`, `J=C`, `K=F`, `L=UNIT`, `M=PRICE`, `N=STORE` |
| Reference tables row 7–8 | `B=CATEGORIES`, `C=UNITS`, `D=STORE` (validation lists)                              |
| Merged cells             | Title blocks only (`B2:N3`, `F7:N8`, …)                                              |

### Counts (this export)

- **42** ingredient rows in `Setup!F10:F1002`
- **0** rows with `PRICE` (M) populated
- Store names in `N` sparse (many blank)

### Mapping → `ingredients`

| Workbook     | Postgres        | Notes                                  |
| ------------ | --------------- | -------------------------------------- |
| `F` ITEM     | `name`          | Trim; preserve casing                  |
| `L` UNIT     | `default_unit`  | Normalize (`lbs`→`lb`, `unit`→`piece`) |
| `G` CATEGORY | `store_section` | e.g. `PANTRY`, `PRODUCE`               |
| —            | `household_id`  | CLI target household                   |

**Do not import:** macro columns (`H`–`K` calories/macros), `M` price (empty;
shopping formulas reference Setup prices but none are set).

---

## Sheet: Recipe Management (recipes + lines)

| Item             | Detail                                                           |
| ---------------- | ---------------------------------------------------------------- |
| Layout           | **3 recipes per band**, columns **B**, **K**, **T**              |
| Band starts      | Rows **5, 61, 117, 173, 229, 285, 341, 397, 453** (56-row pitch) |
| Per-recipe block | Name row +10 metadata +16 ingredient grid through ~+45           |
| Merged cells     | 514 ranges (titles, ingredient tables) — layout only             |

### Block field offsets (from name row)

| Offset  | Field                 | Value column (B-block example)              |
| ------- | --------------------- | ------------------------------------------- |
| +0      | Recipe name           | `B`                                         |
| +10     | Prep Time (min) label | value at name col **+5** (`G`)              |
| +11     | Servings label        | value at name col +5                        |
| +12     | Cook Time label       | value at name col +5                        |
| +14     | Source URL            | name column (may span merged cells)         |
| +16…+45 | Ingredient grid       | name col; qty **+3**; unit **+4**           |
| +46     | `Total` row           | nutrition sums — **do not import**          |
| +47     | `Notes` label         | instructions text may follow in merged area |

### Counts (this export)

| Metric                                      | Count                                      |
| ------------------------------------------- | ------------------------------------------ |
| Recipe blocks with Prep Time pattern        | **27**                                     |
| Named recipes (excl. placeholders)          | **17**                                     |
| Placeholder names (`Recipe 18`…`Recipe 27`) | **10**                                     |
| Blocks with ≥1 ingredient line              | **17**                                     |
| Blocks with source URL                      | **2** (Rice, Garlic Butter Grilled Shrimp) |

Placeholder and template strings to **skip**: `Recipe N`, `ENTER HERE LINK TO
RECIPE`, `ENETER HERE A PICTURE OF DISH`, lone ingredient names mis-detected as
titles (e.g. `Garlic Powder` at row 305 without Prep Time block).

### Mapping → `recipes`

| Workbook                  | Postgres                                                 |
| ------------------------- | -------------------------------------------------------- |
| Name cell                 | `name`                                                   |
| Servings value            | `servings` (default **2** if blank)                      |
| Prep / cook values        | `prep_time_minutes`, `cook_time_minutes` (null if blank) |
| URL                       | `source_url`                                             |
| Notes / instructions area | `instructions` (often empty in export)                   |
| —                         | `notes` default `''`                                     |
| Anchored recipe photo     | `image_path` (private Storage object key)                |

### Mapping → `recipe_ingredients` + `ingredients`

| Workbook             | Postgres                                              |
| -------------------- | ----------------------------------------------------- |
| Ingredient name      | reuse `ingredients` by normalized name                |
| Qty                  | `quantity` (null if blank → "to taste")               |
| Unit                 | `unit` (normalize; warn if unmapped)                  |
| Row order in grid    | `sort_order`                                          |
| Category col in grid | optional `ingredients.store_section` if Setup missing |

**Prefer Recipe Management** as the authoritative line list. The hidden **`data`**
sheet duplicates `(recipe, ingredient, qty, unit)` across month index rows (`G`);
importer dedupes to unique lines per recipe.

---

## Sheet: data (hidden backend)

| Item       | Detail                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| Used range | `A1:DV1311`                                                              |
| Role       | Meal-calendar backend, ingredient spill, photo refs to Recipe Management |
| Import use | **Cross-check / dedupe only** — not primary write source                 |

### Columns (partial)

| Col     | Header / role     | Import?                     |
| ------- | ----------------- | --------------------------- |
| `H`     | Recipe name       | Dedupe key                  |
| `I`     | Item / ingredient | Dedupe key                  |
| `K`     | Qty               | Dedupe key                  |
| `L`     | Unit              | Dedupe key                  |
| `G`     | Month slot index  | **No** (calendar machinery) |
| `Q`     | Photo ref formula | **No**                      |
| `M`–`P` | Nutrition macros  | **No**                      |

**61** `(recipe, ingredient)` pairs with qty in first month slot; each named
recipe appears on **~30** rows (month scaffolding with mostly blank ingredient
cells).

---

## Sheet: Subscription Tracker

| Item          | Detail                                                         |
| ------------- | -------------------------------------------------------------- |
| Data rows     | **4** active vendors (row 11–14)                               |
| Vendor column | **`F`** (not B)                                                |
| Price         | Numeric in **`L`**; **`K`** = `$` display ref only             |
| Derived       | **`N`**, **`O`**, overview **`C`/`D`** — monthly/annual totals |

### Columns (row 10 headers)

| Col | Header         | Persist? | Postgres                                |
| --- | -------------- | -------- | --------------------------------------- |
| F   | Subscription   | Yes      | `vendor`                                |
| G   | Category       | Yes      | `category_label`                        |
| H   | Billing        | Yes      | `cadence` (`Monthly`→`monthly`)         |
| I   | Auto renew     | Optional | `notes` suffix                          |
| J   | Debit day      | Optional | `billing_day` / `renewal_on` if present |
| K   | Price `$`      | **No**   | formula/display                         |
| L   | Price value    | Yes      | `amount_cents`                          |
| M–O | Monthly/annual | **No**   | derive in app                           |

### Observed values

| Vendor    | Category      | Cadence | Amount |
| --------- | ------------- | ------- | ------ |
| Tailscale | Tech          | Monthly | $5.00  |
| ChatGPT   | Tech          | Monthly | $20.00 |
| Cursor    | Tech          | Monthly | $20.00 |
| Youtube   | Entertainment | Monthly | $16.00 |

**Change since prior doc:** 4 vendors confirmed (was 4; row 14 vendor is
`Youtube` with spaced header merge on row 14 col B). No `renewal_on` or debit
day in export — importer sets `billing_day=1` and leaves `renewal_on` null with
a warning (app requires renewal for active subs — operator must set after import
or extend importer with a default next-month date).

Subscription categories (`Tech`, `Entertainment`) are **not** budget kinds.

---

## Sheet: Weekly Shopping List

| Item          | Detail                                              |
| ------------- | --------------------------------------------------- |
| Used range    | `A1:K1000`                                          |
| Start date    | `D5` (2026-06-14 in export)                         |
| List rows     | **~43** formula-driven rows (`FILTER`/`data` spill) |
| Checked state | Column **`J`** boolean                              |

**Do not import** as active grocery list: rows are generated from meal plan +
Setup, prices are formulas, `is_checked` is ephemeral checklist state. Optional
future: import `Setup!M` prices if populated — not in this export.

---

## Budget sheets (documented; out of scope for recipe/subscription importer)

Prior analysis unchanged in substance. Summary:

### Log (transactions)

- Template `B4:G3001`; **0** complete rows (date+kind+subcategory+amount)
- Col **E** = `$` display formula; col **F** = numeric amount
- Col **H** = subcategory validation array — **UI only**

### Monthly Budget

- Planned **Budget** cells → `budget_month_limits` (when budget import runs)
- **Actual** / **LEFT** / kind totals = `SUMIFS` — **derive**, never store

### Start / Back-end

- Category line names → `budget_categories`
- Dashboard totals → **derive**

---

## Values that must never be imported as facts

- Monthly Budget Actual / LEFT / kind Budget totals
- Start dashboard concatenations
- Subscription monthly ↔ annual equivalents (`N`, `O`, overview columns)
- Log col E, Subscription col K/M/O `$` helpers
- Weekly Shopping `F3` total price, generated FILTER rows as persistent items
- Recipe `Total` macro sums, `data` nutrition columns
- Formula-error caches (`#N/A`, `#REF!`)
- Placeholder recipe names and template instruction strings

---

## Formats

| Concern  | Workbook                           | App storage                       |
| -------- | ---------------------------------- | --------------------------------- |
| Money    | `#,##0.00`, `$` via anchor cell    | Integer **cents**                 |
| Dates    | Excel serial; `d mmm yyyy` display | SQL `date`                        |
| Units    | `cup`, `lbs`, `unit`, `tbsp`       | normalized lowercase; map aliases |
| Servings | numeric                            | `numeric > 0`                     |

---

## Data quality findings

| Issue                      | Detail                           | Importer handling                          |
| -------------------------- | -------------------------------- | ------------------------------------------ |
| Sparse budget              | 0 transactions, 2 category lines | Skip budget domains                        |
| Placeholder recipes        | 10× `Recipe 18`…`27`             | Skip                                       |
| Missing renewal dates      | All subscriptions                | Warn; `renewal_on` null                    |
| Unit aliases               | `lbs`, `unit`                    | Map to `lb`, `piece`                       |
| Duplicate ingredient lines | `data` month scaffolding         | Dedupe by recipe+ingredient+qty+unit       |
| No recipe instructions     | Most blocks empty below `Notes`  | Import with `instructions=''`              |
| No grocery prices          | Setup `M` empty                  | Skip price import                          |
| Typo template              | `ENETER HERE A PICTURE OF DISH`  | Skip                                       |
| Inconsistent naming        | `Youtube` vs `YouTube`           | Preserve display; key on normalized vendor |

---

## Explicit entity mappings (in-scope import)

```
Setup!F,L,G
  → ingredients { name, default_unit, store_section }

Recipe Management bands (B/K/T × 56-row pitch)
  → recipes { name, servings, prep_time_minutes, cook_time_minutes, source_url, instructions }
  → recipe_ingredients { ingredient, quantity, unit, sort_order }
  → ingredients (reuse by normalized name)

Subscription Tracker!F,G,H,L (+ optional I,J)
  → subscriptions { vendor, category_label, cadence, amount_cents, billing_day, renewal_on, notes, status }
```

---

## Migration tooling

All workbook extraction and production-loading code was single-use and removed
after the verified cutover. This document retains only the sanitized historical
mapping and outcome. Do not restore the tooling or repeat the import.

---

## Schema comparison (in-scope targets)

| Workbook need      | Postgres                   | Status                              |
| ------------------ | -------------------------- | ----------------------------------- |
| Ingredient catalog | `ingredients`              | OK (`name_normalized` unique)       |
| Recipes            | `recipes`                  | OK                                  |
| Recipe lines       | `recipe_ingredients`       | OK (household trigger)              |
| Subscriptions      | `subscriptions`            | OK (`category_label`, cadence enum) |
| Grocery master     | —                          | No durable source in workbook       |
| Budget             | `budget_*`, `transactions` | Schema ready; data sparse — defer   |

---

## Completed outcome

- Production contains 42 imported ingredients, 12 recipes, and 61 ordered
  recipe-ingredient rows.
- All 12 recipes have one unique, referenced private image object; authenticated
  signed reads pass and anonymous reads fail.
- Subscriptions, budget, meals, shopping state, and calendar events were not
  imported from this workbook.
- All extraction and production-loading tooling was removed. Do not repeat or
  reset the import.
- A future budget migration would require a fresh workbook export and a separate
  reviewed task. Do not add spreadsheet sync or runtime XLSX reads.
