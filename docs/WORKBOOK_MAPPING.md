# Legacy workbook → Postgres mapping (Budget)

Read-only discovery of `private-data/workbook.xlsx` (exported from the household
Google Sheets workbook). **No data has been imported.** This document is the
authoritative mapping for the Budget domain and for a future one-time importer.

Source inspection used openpyxl with both formula and cached-value loads.
Detailed private cell dumps stay under `private-data/` (gitignored) and are not
committed.

**Export caveat:** This `.xlsx` appears sparse for budget line items and the
transaction Log (template rows dominate). Re-export from Google Sheets before
running a real import if the live workbook has more categories or history.

## Workbook inventory

| #   | Sheet                | State   | Budget relevance                                       |
| --- | -------------------- | ------- | ------------------------------------------------------ |
| 1   | Setup                | visible | No (recipe/ingredient setup)                           |
| 2   | Recipe Management    | visible | No                                                     |
| 3   | 5-Week Meal Calendar | visible | No                                                     |
| 4   | Weekly Shopping List | visible | No                                                     |
| 5   | data                 | hidden  | No (meal/recipe backend)                               |
| 6   | Start                | visible | Yes — dashboard + category line-name sources           |
| 7   | Search Recipe        | hidden  | No (recipe prices only)                                |
| 8   | Log                  | visible | Yes — transaction ledger                               |
| 9   | Monthly Budget       | visible | Yes — month selector, planned limits, budget vs actual |
| 10  | Subscription Tracker | visible | Yes — recurring vendors                                |
| 11  | Calendar             | hidden  | No (household calendar; deferred product domain)       |
| 12  | Back-end             | hidden  | Yes — named-range lists for category line items        |

## Category model in the workbook

Two levels:

1. **Kind** (Log column C / named ranges): `Income`, `Bills`, `Expenses`,
   `Savings`, `Debt`
2. **Line item / subcategory** (Log column D / Start + Back-end lists): e.g.
   `Citi`, `Hotel Room`

Defined names:

| Name       | Range             | Maps to `budget_categories.kind` |
| ---------- | ----------------- | -------------------------------- |
| `Income`   | `Back-end!B3:B37` | `income`                         |
| `Bills`    | `Back-end!C3:C37` | `bill`                           |
| `Expenses` | `Back-end!D3:D37` | `expense`                        |
| `Savings`  | `Back-end!E3:E37` | `savings`                        |
| `Debt`     | `Back-end!F3:F37` | `debt`                           |

Lists are filled from **Start** (columns B / D / F / H / J under each kind
header) and spilled into **Back-end**. In this export cache, only **Citi**
(income) and **Hotel Room** (bill) appear; Expenses / Savings / Debt lists are
empty.

Subscription Tracker uses a **different** category vocabulary (`Tech`,
`Entertainment`) that is **not** the Income/Bills/Expenses named-range set.

---

## Sheet: Log (transactions)

| Item             | Detail                                                                    |
| ---------------- | ------------------------------------------------------------------------- |
| Used model range | Header row 3; data template `B4:G3001` (~2997 slots)                      |
| Merged cells     | `B2:G2`, `E3:F3`, `H3:I3`                                                 |
| Date format      | `d" "mmm" "yyyy` (Excel date serial; e.g. `2 Jul 2026`)                   |
| Currency         | Numeric amount in **F** with `#,##0.00`; column **E** is display-only `$` |

### Columns

| Col | Header (row 3) | Persist? | Notes                                                       |
| --- | -------------- | -------- | ----------------------------------------------------------- |
| A   | (empty)        | No       | Unused                                                      |
| B   | DATE           | Yes      | → `transactions.occurred_on`                                |
| C   | CATEGORY       | Indirect | Kind string → used with D to resolve `category_id`          |
| D   | SUBCATEGORY    | Yes      | Line name → `budget_categories.name` (+ kind from C)        |
| E   | AMOUNT (left)  | **No**   | Formula `='Monthly Budget'!$B$11` — literal `$` for display |
| F   | (amount right) | Yes      | Numeric amount → `amount_cents` (×100, integer)             |
| G   | NOTES          | Yes      | → `transactions.notes`                                      |
| H–I | DO NOT DELETE  | No       | Array formula for subcategory dropdown validation           |

### Formulas vs raw values

- **Raw:** date (B), kind (C), subcategory (D), amount (F), notes (G)
- **Formula / UI-only:** E (`$` prefix), H (validation spill)

### Blank / malformed rows

- Most rows are empty templates (E still filled with `$` formula).
- This export: **1** row with a date; **0** rows with kind/subcategory/amount.
- Import rule: skip rows where B, C, D, or F is empty.

### Derived (do not store from sheet)

Nothing on Log is a stored total. Monthly Budget **Actual** columns are
`SUMIFS` over Log — recompute in the app from `transactions`.

### Mapping → `transactions`

| Workbook                        | Postgres                                     |
| ------------------------------- | -------------------------------------------- |
| —                               | `id` = new UUID                              |
| —                               | `household_id` = target household            |
| C + D                           | `category_id` via `(kind, name)` lookup      |
| F                               | `amount_cents` = round(F × 100)              |
| C = Income → `in`; else → `out` | `direction`                                  |
| B                               | `occurred_on` (date-only, no TZ shift)       |
| (none / optional future)        | `payee` default `''` (workbook has no payee) |
| G                               | `notes`                                      |
| importing user                  | `created_by` optional                        |

---

## Sheet: Monthly Budget (limits + dashboard)

| Item            | Detail                                                                           |
| --------------- | -------------------------------------------------------------------------------- |
| Period controls | Month name `D9` (spaced letters, e.g. `J U L Y`); year `D10`                     |
| Month bounds    | `C12` / `E12` derived start/end of month                                         |
| Cash-flow block | Rows ~16–22, columns B–G: Rollover, Income, Bills, Expenses, Savings, Debt, LEFT |
| Planned amounts | **Budget** columns (raw numbers, `#,##0.00`)                                     |
| Actual amounts  | **Actual** columns = `SUMIFS` on Log (formula-derived)                           |
| Trackers        | Bills I–N, Expenses P–T, Savings V–AA, Debt AC–AH                                |
| Merged cells    | Many (titles, headers, summary strips) — layout only                             |
| `$` anchor      | `B11` literal `$`; concatenated into display cells                               |

### Formulas vs raw values

| Value                        | Persist? | Notes                                      |
| ---------------------------- | -------- | ------------------------------------------ |
| Month / year selectors       | Context  | Scope for limits (`month_start`)           |
| Kind-level Budget (E17–E21)  | Optional | Aggregate of line budgets; usually derived |
| Line-level Budget (e.g. L16) | **Yes**  | Planned limit per category for the month   |
| Actual columns               | **No**   | `SUMIFS` → derive from `transactions`      |
| LEFT / amount left to spend  | **No**   | Derive: planned − actual (by policy)       |
| Rollover                     | Confirm  | See cleaning decisions                     |

### Mapping → monthly limits (schema addition required)

Workbook stores **per-line planned amounts** for the selected month. Postgres
today has **no** month-scoped limit table.

Proposed target (see `ARCHITECTURE.md`):

| Workbook                                     | Postgres `budget_month_limits` |
| -------------------------------------------- | ------------------------------ |
| Month/year (D9/D10) → first day of month     | `month_start` (`date`)         |
| Line item name + kind (tracker / Start list) | `category_id`                  |
| Line Budget cell                             | `limit_cents`                  |
| —                                            | `household_id`                 |

Kind-level Budget totals (Income/Bills/…) should be **derived** as the sum of
that kind’s line limits for the month, not stored separately, unless a kind has
a total with no lines (then confirm).

---

## Sheet: Start (dashboard + category names)

| Item         | Detail                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Role         | Landing dashboard; also **source** of category line names for Back-end |
| Totals       | Formula concatenations from Monthly Budget actuals — **do not store**  |
| Line names   | Raw text under Income / Bills / Expenses / Savings / Debt headers      |
| Merged cells | Decorative title merges                                                |

### Mapping → `budget_categories`

| Workbook                        | Postgres                          |
| ------------------------------- | --------------------------------- |
| Column group (Income/Bills/…)   | `kind`                            |
| Line name cell (e.g. under B10) | `name`                            |
| Visual order top→bottom         | `sort_order`                      |
| —                               | `archived_at` null unless retired |

---

## Sheet: Back-end (category list mirror)

| Item         | Detail                                          |
| ------------ | ----------------------------------------------- |
| Role         | Hidden mirror of Start lists for named ranges   |
| Persist from | Prefer **Start** (or union of Start + Back-end) |
| Import       | Deduplicate; ignore blank cells in `B3:F37`     |

---

## Sheet: Subscription Tracker

| Item          | Detail                                                          |
| ------------- | --------------------------------------------------------------- |
| Data rows     | Vendors starting ~row 11; this export has 4 filled vendors      |
| Price display | Column K = `$` ref; column L = numeric price                    |
| Derived       | Monthly / annual equivalent columns — **do not store**; compute |
| Cadence       | Billing column values like `Monthly`                            |

### Observed columns (conceptual)

| Workbook field       | Persist? | Postgres `subscriptions`        |
| -------------------- | -------- | ------------------------------- |
| Subscription name    | Yes      | `vendor`                        |
| Category (Tech, …)   | Confirm  | See cleaning decisions          |
| Billing cadence      | Yes      | `cadence` (`monthly`, etc.)     |
| Auto renew           | Optional | `notes` or future boolean       |
| Debit day            | Optional | `notes` or future `renewal_on`  |
| Price (L)            | Yes      | `amount_cents`                  |
| Monthly/annual equiv | No       | Derive from cadence + amount    |
| Status               | Default  | `active` unless marked canceled |

Subscription categories in the sheet (`Tech`, `Entertainment`) are **not** the
same as budget kinds. Recommended V1 options (pick one before import):

1. Create matching `budget_categories` with `kind = 'expense'` and link
   `category_id`, or
2. Leave `category_id` null and store the label in `notes`, or
3. Add `subscriptions.category_label text` (schema change).

---

## Values that must be derived (never imported as facts)

- Monthly Budget **Actual** totals and per-line actuals (`SUMIFS`)
- Start dashboard totals
- LEFT / remaining to spend
- Subscription monthly↔annual conversions
- Currency `$` prefix cells (`Monthly Budget!B11` and references)
- Log column E and Subscription column K display helpers
- Subcategory validation array formulas (Log H)

## Formats

| Concern  | Workbook                                 | App storage                    |
| -------- | ---------------------------------------- | ------------------------------ |
| Money    | Decimal dollars, `#,##0.00`, `$` via B11 | Integer **cents**              |
| Dates    | Excel serial; display `d mmm yyyy`       | SQL `date`                     |
| Month UI | Spaced month name + year number          | `month_start` = first of month |

## Duplicate / inconsistent categories

- In this export: no duplicate line names across kinds.
- Risk: `UNIQUE (household_id, name)` on `budget_categories` forbids the same
  display name under two kinds (e.g. “Transfer” as savings and debt). Prefer
  `UNIQUE (household_id, kind, name)` before import if that can occur.
- Subscription labels (`Tech`) vs budget kinds (`Expenses`) are inconsistent
  vocabularies — do not auto-merge without confirmation.
- Spelling/spacing: import should trim and reject empty names; confirm
  case-folding policy (`Youtube` vs `YouTube`).

## Blank / malformed handling (import rules)

1. Skip Log rows missing date, kind, subcategory, or amount.
2. Skip zero-length category list cells.
3. Reject negative amounts unless direction is modeled separately (workbook
   appears to use positive magnitudes + kind).
4. Do not import formula-error caches (`#N/A`, `#REF!`) as values.
5. Treat Log E / Subscription K as non-data.

---

## Explicit entity mappings

### Budget categories

```
Start line names (+ Back-end / named ranges)
  → budget_categories { name, kind, sort_order }
```

### Monthly limits

```
Monthly Budget line Budget cells for selected month
  → budget_month_limits { category_id, month_start, limit_cents }
```

Kind-level Budget cells → prefer sum of line limits (derived).

### Transactions

```
Log!B,C,D,F,G (non-empty data rows)
  → transactions { category_id, amount_cents, direction, occurred_on, notes }
```

### Subscriptions

```
Subscription Tracker vendor rows
  → subscriptions { vendor, amount_cents, cadence, status, category_label, notes }
```

---

## Schema comparison (applied)

| Need from workbook          | Postgres                       | Status                              |
| --------------------------- | ------------------------------ | ----------------------------------- |
| Category kinds + line names | `budget_categories`            | `UNIQUE (household_id, kind, name)` |
| Transactions                | `transactions`                 | OK                                  |
| Subscriptions               | `subscriptions.category_label` | Free text; no budget FK             |
| Per-month planned limits    | `budget_month_limits`          | Applied (`20260716240000_…`)        |
| Actuals / remaining         | N/A (formulas)                 | Derive in domain/repos              |
| Payee                       | `transactions.payee`           | Unused by workbook; keep for app    |
| Rollover                    | Not in schema                  | V1: no automatic rollover           |

## Cleaning decisions (resolved)

1. **Monthly limits** — `budget_month_limits` approved and migrated.
2. **Category uniqueness** — `(household_id, kind, name)`.
3. **Subscription categories** — `category_label` text; no budget FK.
4. **Rollover** — not in V1; explicit limits per month only.
5. **Sparse export** — still re-export live Sheet before any future import.
6. **Payee** — optional UI field; empty on import.
7. **Direction rules** — Income = `in`; Bills/Expenses/Savings/Debt = `out`
   with positive `amount_cents`.
8. **Cents** — store integer cents; sheet values use two decimal places.

## Recommendation

Schema prep is done. Implement the Budget vertical slice against empty/seed
data per the plan in `IMPLEMENTATION.md`. Keep the XLSX importer deferred.
