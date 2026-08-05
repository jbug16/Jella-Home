# Jella Home — Future Features

Jella Home is a private household application used only by Jenna and her
girlfriend. Features in this document should be prioritized around their
household — not general public or multi-tenant use cases.

This is an **idea backlog**, not an implementation roadmap. Nothing here is
committed work unless it appears in [`IMPLEMENTATION.md`](../IMPLEMENTATION.md).

Each entry uses this structure:

- **Summary** — what the feature is
- **User value** — why it helps the household
- **Possible V1** — smallest useful version
- **Later expansion** — optional follow-ons
- **Dependencies** — schema, integrations, or prior work
- **Risks or unknowns** — constraints and open questions
- **Status** — `Idea`, `Research needed`, `Planned later`, or `Not currently planned`

---

## Smart Shopping and Store Intelligence

### Summary

Allow grocery ingredients and manual shopping items to connect to preferred
stores and store locations.

The app could help identify:

- current item price
- preferred store
- aisle or store section
- cheaper prices at another preferred store
- active sales
- useful alternatives
- which store would be best for the current shopping list

### User value

Reduce the time spent checking several store apps and make shopping lists more
useful while physically shopping.

### Possible V1

Start with manually managed store information:

- favorite stores
- specific store locations
- default store for an ingredient
- manually entered normal price
- aisle or section
- preferred brand
- notes

Allow a shopping item to show information such as:

- Publix — Produce — approximately $3.99
- Walmart — Aisle A12 — approximately $3.28
- Aldi — Produce — preferred for this item

Do not require live pricing for the first version.

### Later expansion

Research:

- retailer APIs
- product-search APIs
- store inventory APIs
- receipt import
- price history
- sale detection
- recommendations when another preferred store is cheaper
- shopping-list cost estimates
- best-store comparison for an entire list
- store-specific list grouping
- barcode matching

### Important constraints

- Many retailers do not offer stable public pricing or aisle APIs.
- Prices and inventory can vary by location.
- Web scraping should not be assumed to be reliable or permitted.
- Exact store location must be part of the lookup.
- Manual data should remain usable when an external service is unavailable.
- Do not build this until suitable data providers have been researched.

### Dependencies

Potential future data model:

- `stores`
- `store_locations`
- `household_store_preferences`
- `ingredient_store_preferences`
- `store_products`
- `item_price_observations`
- `store_sections`

### Risks or unknowns

Data-provider availability, terms of use, and location accuracy are unknown until
researched. V1 manual entry must stay useful without any external API.

### Status

Research needed

---

## Home Assistant Lighting Control

### Summary

Add a Home page or Lights page that controls household lights through Home
Assistant.

Support the apartment's current smart-light setup without creating a separate
control system inside Jella Home.

### User value

Allow both household members to control lights from the same application used
for budgeting, meals, shopping, and calendar planning.

### Possible V1

Provide:

- list of rooms
- light name
- current on/off state
- on/off toggle
- brightness control where supported
- basic scenes such as:
  - All off
  - Evening
  - Movie
  - Bedtime

The initial version should use Home Assistant as the source of truth.

Jella Home should send commands to Home Assistant rather than communicate
directly with each bulb.

### Security requirements

- Home Assistant credentials or long-lived tokens must remain server-only.
- Never expose a Home Assistant token to the browser.
- Do not store tokens in Git.
- The deployed application must use an approved secure connection to the Home
  Assistant instance.
- Do not expose the Home Assistant server directly to the public internet
  without an appropriate secure architecture.

### Architecture questions to research later

- Home Assistant REST API versus WebSocket API
- Home Assistant Cloud
- secure reverse proxy
- Tailscale or another private network path
- how a hosted Netlify application would securely reach a local Home Assistant
  instance
- whether state should update in real time
- how to handle Home Assistant being offline

### Later expansion

- scenes
- rooms
- brightness
- color temperature
- color controls
- schedules
- automation shortcuts
- Dashboard quick controls
- Calendar-driven scenes
- away mode
- energy use where supported

### Dependencies

Server-only Home Assistant client module, secure network path from Netlify to
the household instance, and env-based configuration (never committed).

### Risks or unknowns

Hosted-to-local connectivity and token rotation need a deliberate architecture
before any UI work.

### Status

Planned later

---

## Pantry inventory

### Summary

Track what is on hand at home so meal planning and shopping can account for
items already in the pantry.

### User value

Fewer duplicate purchases and clearer “buy vs skip” decisions when building a
shopping list.

### Possible V1

Manual pantry quantities tied to existing `ingredients`, with quick adjust
(+/−) from a Pantry page.

### Later expansion

Expiry dates, location (fridge/freezer/pantry), low-stock alerts, and optional
deduction when a meal is marked cooked.

### Dependencies

Ingredient catalog; optional tie-in to grocery generation logic.

### Risks or unknowns

Keeping counts accurate without barcode scanning may require low-friction UX;
listed as a non-goal in [`ARCHITECTURE.md`](../ARCHITECTURE.md) for the current
phase.

### Status

Not currently planned

---

## Bank transaction import or Plaid

### Summary

Import bank or card transactions instead of typing each expense manually.

### User value

Less data entry for the monthly budget and fewer missed transactions.

### Possible V1

CSV/OFX import mapped to budget categories with a review step before commit.

### Later expansion

Plaid or similar aggregator, recurring-transaction detection, and reconciliation
with subscription renewals.

### Dependencies

Budget categories and transactions domain; secure handling of financial credentials
(server-only, never in Git).

### Risks or unknowns

Plaid cost, institution coverage, and privacy expectations for a two-person app.
Manual CSV may be sufficient indefinitely.

### Status

Not currently planned

---

## Calendar import/sync

### Summary

Import or sync external calendars (Google, iCloud, work) alongside native
household events.

### User value

One place to see household plans plus external commitments without double entry.

### Possible V1

Read-only ICS URL subscription for one external calendar, merged into the
Calendar day view as a separate source (similar to subscription renewals).

### Later expansion

Two-way sync, multiple calendars, and per-member visibility rules.

### Dependencies

Calendar source adapter pattern (see Milestone 10); OAuth or signed ICS URLs.

### Risks or unknowns

External sync is explicitly out of scope for Calendar V1 per ADR-020. Conflict
resolution and timezone rules need design before write sync.

### Status

Not currently planned

---

## Notifications and reminders

### Summary

Push or email reminders for bills, subscription renewals, meal prep, or calendar
events.

### User value

Timely nudges without opening the app — especially for shared financial dates.

### Possible V1

Browser notification opt-in for subscription renewals due within seven days
(requires a real reminder source; Payment Reminders adapter is reserved in
Calendar but has no V1 data source).

### Later expansion

Email digests, SMS, and calendar-linked meal reminders.

### Dependencies

Reliable due-date sources; notification delivery (web push, email provider).

### Risks or unknowns

Notifications are a non-goal in the current architecture phase. Payment
reminders need a defined data model before any UI toggle returns.

### Status

Not currently planned

---

## PWA / native mobile experience

### Summary

Installable progressive web app or native clients reusing the same server APIs
and domain logic.

### User value

Faster launch from the home screen and optional offline read paths while shopping
or cooking.

### Possible V1

Web app manifest, icons, and service worker for shell caching only (no offline
writes).

### Later expansion

Native iOS/Android apps sharing repositories and validation from this repo.

### Dependencies

Responsive UI already in place; auth cookie behavior on installed PWAs.

### Risks or unknowns

Native apps are explicitly deferred in V1 per `AGENTS.md`. Offline sync adds
complexity disproportionate to two users unless scoped narrowly.

### Status

Planned later

---

## Data backup and export

### Summary

Export household data (JSON/CSV) and document restore procedures for Supabase.

### User value

Peace of mind and portability if the hosted project needs migration or disaster
recovery.

### Possible V1

Admin-only script exporting core tables for one household; documented restore
steps in `docs/`.

### Later expansion

Scheduled backups, encrypted off-site storage, and selective per-domain export
from the UI.

### Dependencies

Service-role export script; alignment with RLS and Storage objects (recipe images).

### Risks or unknowns

Exports must never land in Git or public artifacts. Image blobs need separate
handling from relational rows.

### Status

Idea

---

## Household maintenance tracking

### Summary

Track recurring home tasks — filter changes, HVAC service, lease renewals,
appliance warranties — outside the financial budget.

### User value

Fewer missed maintenance dates and a shared view of “what needs doing around
the apartment.”

### Possible V1

Simple task list with title, due date, recurrence, and done/archive state (may
overlap with Calendar or Dashboard countdown patterns).

### Later expansion

Attachments (receipts, manuals), assign-to-partner, and links to subscriptions
or expenses.

### Dependencies

Possibly reuses `calendar_events` patterns or a dedicated `maintenance_tasks`
table.

### Risks or unknowns

Scope overlap with Calendar and Dashboard countdowns — consolidate UX before
adding a fourth surface.

### Status

Idea

---

## Performance — Meals and Recipes client payloads

### Summary

Meals and Recipes pages still load full recipe catalogs (including signed cover
URLs) into client panels. Dashboard polish scoped image loading to today's meals
only; the same pattern could extend to Meals/Recipes browse flows.

### User value

Faster page loads on phones when opening meal planning or recipe pickers.

### Possible V1

Paginated or search-driven recipe lists; lazy-load cover URLs; server-render
list rows without shipping the full catalog to client state.

### Later expansion

Shared caching for cover URLs; prefetch on hover (desktop only).

### Dependencies

Existing recipe repositories and Storage signing helpers.

### Risks or unknowns

Low user count makes this optimization non-urgent unless catalogs grow substantially.

### Status

Idea

_(Preserved from archived [`docs/archive/POLISH.md`](archive/POLISH.md).)_
