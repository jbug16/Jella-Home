# Jella Home: Agent Instructions

## Product

Jella Home is a private household web app for Jenna and her girlfriend. It replaces the difficult parts of their existing Google Sheets budget and meal-planning workbook with a clearer interface.

The current workbook includes these functional areas:

- Recipe and ingredient management
- Five-week meal calendar
- Weekly shopping list
- Monthly budget and transaction logging
- Subscription tracking

This is not a public SaaS product. Optimize for two trusted users, ease of use, reliability, and low maintenance rather than multi-tenant complexity.

## Product priorities

1. Make common household actions faster and clearer than the legacy spreadsheet.
2. Use Supabase Postgres as the application source of truth.
3. Use Supabase Auth for a single shared household login; authorize via household membership and Row Level Security.
4. Treat the existing Google Sheets / XLSX workbook as a one-time migration source only — do not build spreadsheet synchronization.
5. Design desktop-first, but make every workflow fully usable on supported mobile and tablet sizes.
6. Prefer simple, explicit interfaces over dense spreadsheet-style screens.
7. Avoid adding features, abstractions, dependencies, or infrastructure that are not needed for the current task.

## Supported devices

Design and test for:

- Desktop browsers at 1280px and wider
- iPad Pro in portrait and landscape
- iPhone 13 Pro: 390 x 844 CSS pixels
- iPhone 12 mini: 360 x 780 CSS pixels

No page may require horizontal scrolling at 360px wide. Touch targets should be at least 44 x 44 CSS pixels. Forms must remain usable with the iOS on-screen keyboard open.

Version 1 is a responsive website. Structure it so a PWA or native mobile client can be added later, but do not build a native app unless explicitly requested.

## Technical stack

Use the versions already installed in the repository. Do not upgrade major versions without being asked.

Preferred stack:

- Next.js App Router
- TypeScript with strict mode
- React Server Components by default
- Tailwind CSS
- shadcn/ui
- Zod for validation
- React Hook Form when a form benefits from client-side state
- Supabase Postgres and Supabase Auth
- Server-only repository modules over the Supabase client
- Playwright for critical end-to-end flows
- Vitest or the repository's existing test runner for unit tests

Use npm unless the repository is already configured for another package manager.

## Next.js rules

Before changing Next.js code, inspect the installed version and read the matching bundled documentation when available.

- Prefer Server Components.
- Add `"use client"` only where browser state, effects, event handlers, or client-only libraries require it.
- Keep the Supabase service-role key and all privileged database access in server-only modules.
- Browser Supabase clients are for auth session UI only; product data access goes through repositories on the server.
- Use Server Actions or Route Handlers for mutations. Choose one consistent approach per feature.
- Validate all server inputs with Zod.
- Revalidate or refresh affected data after successful mutations.
- Handle loading, empty, success, and error states explicitly.
- Use stable UUID domain identifiers from Postgres; never treat spreadsheet row numbers as permanent IDs.

## Data architecture

Supabase Postgres is the application persistence layer. The legacy workbook may be imported once later; it is not a live backend.

Use this separation:

1. `lib/supabase/`: server, browser (auth-only), and admin (service-role) clients; generated database types
2. `lib/repositories/`: typed domain operations such as `listRecipes`, `saveMealPlan`, and `addExpense`
3. `lib/domain/`: Zod schemas, domain types, and pure calculation helpers
4. UI routes and components consume repository functions, not Supabase query builders

Schema, RLS, migrations, and import strategy are documented in [`ARCHITECTURE.md`](ARCHITECTURE.md).

Use UUID primary keys for recipes, meals, expenses, subscriptions, ingredients,
and grocery items. Do not identify records solely by display name.

Treat writes as potentially concurrent. Read the current record before destructive updates when practical, and return clear conflicts rather than silently overwriting unexpected data.

Never log credentials, private financial details, full database dumps, or authentication tokens.

## Initial domain modules

Keep these domains separate in schema and repositories:

- `recipes`: recipe metadata, servings, ingredients, instructions
- `meal-plans`: date, meal slot, recipe, servings, notes
- `shopping` / grocery: generated and manually added items, quantities, stores, checked state
- `budget`: income, bills, expenses, savings, debt, categories, monthly summaries
- `subscriptions`: vendor, category, cadence, cost, renewal date, status

Put calculations in domain utilities or repository functions and cover important calculations with tests. Do not reproduce legacy spreadsheet formulas in React components.

## UX and visual rules

Use shadcn/ui components before creating custom primitives. It is acceptable to customize their styling, but preserve accessible behavior.

- Desktop layouts may use a sidebar and multi-column dashboards.
- Mobile layouts should use a compact header or bottom navigation and single-column content.
- Use cards for summaries, not for every small piece of content.
- Use tables on desktop only when comparison matters. Convert dense tables into cards, lists, or drawers on narrow screens.
- Use a Drawer or Sheet for mobile forms when appropriate and a Dialog on larger screens.
- Keep primary actions visible and plainly labeled.
- Do not hide required actions behind hover interactions.
- Do not use color as the only indicator of status.
- Include visible labels for form controls.
- Support keyboard navigation and meaningful focus states.
- Use concise household-friendly language. Do not expose spreadsheet terminology, cell references, API errors, or implementation details to users.
- Avoid decorative gradients, excessive animation, glassmorphism, and dashboard clutter unless explicitly requested.

## Responsive implementation

Build the narrow layout intentionally rather than simply shrinking the desktop UI.

For every route or substantial component:

1. Verify at 360 x 780.
2. Verify at 390 x 844.
3. Verify at an iPad portrait viewport.
4. Verify at a desktop viewport.

Account for iOS safe areas for fixed headers, footers, drawers, and bottom navigation. Avoid fixed-height content regions that can be obscured by mobile browser chrome or the keyboard.

## Forms and mutations

- Prevent accidental duplicate submissions.
- Disable the submit control while saving.
- Preserve user-entered values after recoverable errors.
- Confirm destructive actions such as deleting a recipe or transaction.
- Prefer optimistic updates only when rollback is straightforward.
- Display actionable error messages.
- Use currency-safe calculations. Do not rely on binary floating-point arithmetic for persisted financial values; store cents as integers in application logic where possible.
- Parse dates deliberately and avoid timezone-dependent shifts for date-only meal and budget records.

## Testing

At minimum, test:

- Budget totals and currency calculations
- Recurring subscription monthly and annual conversions
- Meal-plan date handling
- Shopping-list aggregation and quantity behavior
- Repository mapping between database rows and domain objects
- Validation for every write operation

Use Playwright for these critical flows once implemented:

1. Add and edit an expense
2. Add a meal to a date
3. Generate or update a shopping list
4. Add or edit a subscription
5. Complete each flow at a 360px mobile viewport

Run the relevant formatter, linter, type checker, and tests before considering a task complete. Do not claim success while known failures remain.

## Security and privacy

- The app is private and requires authentication before real household data is used.
- Only the two intended household members should be able to sign in and access data.
- Authorize with household membership in application code and Supabase Row Level Security.
- Never commit Supabase service-role keys, database dumps, or the household workbook.
- Use environment variables for secrets. The service-role key must never be exposed to the client.
- Ensure `.env*`, credential files, exports, and local workbook copies under `private-data/` are ignored by Git.
- Perform authorization checks server-side, not only in the UI.

## Version 1 scope

Prioritize a coherent first release over implementing every workbook tab at once.

Recommended order:

1. App shell, authentication, navigation, and responsive layout
2. Monthly budget dashboard and transaction entry
3. Weekly meal planner
4. Shopping list
5. Recipe management
6. Subscription tracker

Do not add native mobile code in version 1. A later mobile version should reuse domain schemas, validation, and server APIs where practical.

## Agent workflow

Before coding:

1. Inspect the repository, package versions, and existing conventions.
2. Identify the smallest complete vertical slice.
3. State assumptions when the workbook behavior is ambiguous.
4. Prefer adapting existing code over creating parallel implementations.

While coding:

- Keep changes scoped to the request.
- Use descriptive names and small modules.
- Avoid placeholder data in production paths.
- Do not redesign unrelated screens.
- Do not build spreadsheet synchronization unless explicitly requested.

After coding:

1. Run lint, type checking, and relevant tests.
2. Use browser testing for changed user flows.
3. Check the supported mobile and desktop viewports.
4. Summarize files changed, behavior implemented, tests run, and any remaining limitations.

## Deployment workflow

Environments and hosting details: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
Short agent pointer: [`CURSOR.md`](CURSOR.md).

Branch mapping:

- `main` → production (`https://jella-home.netlify.app`) — only when explicitly requested
- feature branches → active work; optional temporary Deploy Previews

For every **completed** implementation task:

1. Make the requested changes.
2. Run all relevant verification (`npm run verify`; also `npm run test:db` twice consecutively when migrations or database code changed; ensure `npm run build` succeeds).
3. Update documentation when required.
4. Commit completed work (Conventional Commits; still only when the task/user authorizes committing).
5. When production deployment is explicitly authorized, push `main` and confirm the automatic Netlify deploy.
6. Verify the hosted production application (auth, shell, changed routes, mobile/desktop).
7. Return the production URL and a compact deployment report.

Do **not** push partially implemented work, knowingly broken builds, failing migrations, failing required tests, secrets, `.env.local`, or temporary debugging code.

Never deploy or merge to production unless the user explicitly asks.

## Git workflow

Only create commits when the user explicitly asks. When committing, always use [Conventional Commits](https://www.conventionalcommits.org/) with one of these prefixes:

| Type        | Use for                                        |
| ----------- | ---------------------------------------------- |
| `feat:`     | New features                                   |
| `fix:`      | Bug fixes                                      |
| `refactor:` | Internal improvements without behavior changes |
| `docs:`     | Documentation only                             |
| `test:`     | Tests only                                     |
| `perf:`     | Performance improvements                       |
| `style:`    | Formatting only (no logic changes)             |
| `build:`    | Build system or dependencies                   |
| `ci:`       | GitHub Actions / CI changes                    |
| `chore:`    | Miscellaneous maintenance                      |

Commit message format:

```text
type: short description in imperative mood
```

Keep the subject line concise (about 72 characters or fewer). Focus on why the change exists when that is not obvious from the type alone. Do not use a scope unless it clearly helps (optional; e.g. `feat(budget): …`).

Examples for this project:

- `feat: establish Supabase authentication foundation`
- `feat: implement budget management`
- `feat: add meal planner domain`
- `feat: implement grocery list generation`
- `fix: correct household RLS policy`
- `fix: prevent duplicate budget categories`
- `refactor: simplify repository interfaces`
- `docs: document local Supabase workflow`
- `test: expand budget calculation coverage`
- `chore: upgrade project dependencies`
