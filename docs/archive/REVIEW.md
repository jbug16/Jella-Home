# Jella Home code review

Reviewed: 2026-07-23
**Remediation:** 2026-07-23 on branch `fix/review-remediation` (see work log in
`IMPLEMENTATION.md`). High and medium findings below were addressed in code;
re-verify with `npm run verify`, `npm run test:db` twice, and
`npm audit --omit=dev`.

## Executive summary

Jella Home has a strong foundation for a private two-person household app. The
domain boundaries are clear, product data stays behind server-only repositories,
Supabase RLS is unusually well tested, financial values use integer cents, and
the responsive test suite covers the important household flows in Chromium and
WebKit.

~~I would not call the current build production-ready yet.~~ Prior high-priority
blockers (dependency advisories and household timezone) are remediated. Original
findings for context:

Two high-priority issues should be resolved first:

1. The installed production dependency tree has current high-severity
   advisories.
2. “Today” is derived from the server's local timezone, so a UTC-hosted app can
   show tomorrow during the household's evening.

There are also several medium-priority correctness and security issues:
post-authentication open redirects, silent last-write-wins updates, non-atomic
multi-day meal creation, malformed month URLs that can reach the database, and
mobile controls smaller than the required 44px target.

## Scope

This review covered:

- Next.js routing, Server Components, Server Actions, and the responsive shell
- Authentication, household membership, Supabase repositories, migrations, RLS,
  and Storage policies
- Budget, meals, shopping, recipes, subscriptions, dashboard, and calendar
- Domain validation and date/currency calculations
- Accessibility and responsive behavior at narrow phone, iPhone/WebKit,
  iPad/WebKit, and desktop viewports
- Unit, browser, database, build, lint, type-check, formatting, and dependency
  audit results

No application behavior was changed. Only this review file was added.

## Findings

### High — Installed production dependencies have known high-severity advisories

`package.json:43` pins Next.js `16.2.10`. `npm audit --omit=dev` reports three
high-severity vulnerable packages in the production tree:

- `next@16.2.10`
- Next's transitive `postcss@8.4.31`
- `sharp@0.34.5`

The Next.js advisories include proxy bypass, Server Action denial of service and
SSRF, cache confusion, and disclosure of internal Server Function endpoints.
This app relies on the Next proxy for its authentication redirect, so the proxy
bypass advisory is directly relevant even though the app has RLS as a second
authorization layer.

Recommendation:

1. Move Next.js and `eslint-config-next` to the patched compatible release
   identified by the audit (`16.2.11` at review time).
2. Regenerate the lockfile without using a major-version upgrade.
3. Rerun the complete build, Chromium/WebKit, and RLS suites.
4. Confirm the resulting `postcss` and `sharp` versions are no longer reported.

Do not depend on RLS alone as a reason to postpone this. RLS reduces data-access
impact, but it does not address denial of service, cache confusion, or framework
endpoint disclosure.

### High — Household “today” depends on the hosting server's timezone

`lib/domain/dates.ts:9-13` builds a date with `Date#getFullYear`,
`getMonth`, and `getDate`. On the server those methods use the runtime's local
timezone, not the household's timezone. `lib/domain/dashboard.ts:316-325` then
uses that result for the dashboard day, week, and month. The same pattern feeds
Budget, Meals, Subscriptions, Calendar, and Shopping.

There is no household timezone setting or deployment `TZ` configuration. If the
Netlify runtime is UTC while the household is in America/New_York, the app will
advance to the next date at 8:00 PM or 7:00 PM local time depending on daylight
saving time. That can:

- move the dashboard to tomorrow's meals and events;
- mark subscriptions due a day early;
- default a transaction or meal to the wrong date;
- navigate Calendar and Shopping to the wrong week near Saturday night; and
- change the visible budget month several hours before local midnight.

The implementation notes explicitly accept “server TZ ≈ household TZ”, but that
assumption is not guaranteed by the deployment configuration.

Recommendation: define one explicit household timezone for V1 (for example,
`HOUSEHOLD_TIME_ZONE=America/New_York`) and derive date-only values with
`Intl.DateTimeFormat(..., { timeZone })` or an equivalent tested utility. Pass
the same resolved date through each view model instead of calling `new Date()`
independently. Add tests around local midnight and both DST boundaries.

### Medium — The sign-in return path allows protocol-relative open redirects

`app/sign-in/page.tsx:14-17` and `app/auth/actions.ts:57-62` consider any value
starting with `/` safe. That includes `//attacker.example`, which browsers treat
as a protocol-relative external URL. A link such as:

```text
/sign-in?next=//attacker.example
```

can send a user from the genuine Jella Home sign-in page to an attacker-controlled
site after successful authentication. Credentials are still posted to Jella
Home, but the redirect creates a credible phishing handoff.

Recommendation: parse the destination against the application's origin and
require the resulting origin to match. At minimum reject `//`, backslashes,
control characters, and non-application routes. Keep the validation in one
shared helper used by both the page and action. Add an end-to-end test covering
external, protocol-relative, malformed, and valid internal destinations.

The proxy also records only `pathname` in `next`, so legitimate query state such
as a selected budget month is lost after sign-in (`lib/supabase/proxy.ts:79-82`).
Preserve the query string after the destination is made safe.

### Medium — Partner edits can silently overwrite each other

The tables have `updated_at` triggers, but write schemas do not carry a version
and update queries match only household and record ID. Examples include:

- transactions: `lib/repositories/budget.ts:269-302`
- calendar events: `lib/repositories/calendar-events.ts:103-134`
- subscriptions: `lib/repositories/subscriptions.ts:65-121`
- planned meals: `lib/repositories/meal-plans.ts:177-230`
- grocery items: `lib/repositories/shopping.ts:339-384`

If both partners open the same record, the second save silently replaces the
first save, including fields the second form did not intend to change. Deletes
can similarly succeed against a record that changed after the confirmation was
opened. This conflicts with the project's stated requirement to detect
unexpected concurrent changes rather than silently overwrite them.

Recommendation: include `updatedAt` in editable domain objects and hidden form
state, then make updates/deletes conditional on both `id` and the expected
`updated_at`. A zero-row result should return a household-friendly conflict such
as “This changed on another device. Review the latest version and try again.”
Recipes need the same check inside their save RPC.

### Medium — Multi-day meal creation is not atomic

`app/(app)/meals/actions.ts:82-103` creates one planned meal at a time in a loop.
If the first three inserts succeed and the fourth fails, the action reports an
error even though three meals remain saved. Retrying can then create duplicates.
The UI cannot accurately explain or roll back the partial result.

Recommendation: move batch creation into one `SECURITY INVOKER` Postgres RPC, or
submit the rows in one repository insert after resolving the recipe once. The
operation should either create every requested day or create none. Add a test
that forces a later row to fail and asserts that no earlier rows persist.

### Medium — Malformed month parameters can reach Postgres and produce an error page

`isoDateSchema` checks only string shape (`lib/domain/dates.ts:4-6`).
`monthStartFor` therefore accepts values such as `2026-99-01`
(`lib/domain/budget.ts:184-188`).

Budget's resolver catches schema exceptions, but no exception occurs for an
out-of-range month, so `/budget?month=2026-99` reaches date-filtered repository
queries (`app/(app)/budget/page.tsx:25-45`). Calendar has the same issue for a
shape-valid `YYYY-MM` parameter (`app/(app)/calendar/page.tsx:66-74`).

Recommendation: introduce a real calendar-date schema and a `YYYY-MM` schema
that validates month range, then use them at every URL and write boundary.
Malformed navigation should canonicalize to the current period without querying
Postgres. Add browser tests for month `00`, `13`, `99`, invalid days, arrays,
and oversized values.

### Medium — Several mobile controls are smaller than the 44px touch target

The shared dialog and sheet close controls render a 16px icon with no minimum
button dimensions:

- `components/ui/dialog.tsx:70-77`
- `components/ui/sheet.tsx:77-81`

The Shopping item form also uses the default `Input` and `Button` sizes
(`components/shopping/shopping-item-form-dialog.tsx:67-150`). Those primitives
default to 36px high in `components/ui/input.tsx:11` and
`components/ui/button.tsx:28-34`.

The interface is visually responsive and avoids horizontal overflow, but these
controls do not meet the repository's explicit 44×44 requirement. This matters
most in bottom sheets on the two target iPhones.

Recommendation: give all dialog/sheet close controls `size-11`; use
`min-h-11` for form fields and action buttons on touch layouts; and add an
automated target-size assertion for visible interactive elements at 360px and
390px. Keep justified exceptions (such as inline text links) explicit.

### Low — Rendering Shopping performs a database write

`app/(app)/shopping/page.tsx:30` calls
`getOrCreateGroceryListForWeek` during a GET render. Merely opening or
prefetching a valid Shopping URL creates persistent data for that week.

The operation is idempotent because of the unique active-list index, so the
impact is limited. It still violates safe GET expectations and can create empty
historical lists from links, prefetches, monitoring, or accidental navigation.

Recommendation: render an empty “Start this week's list” state from
`getGroceryListForWeek`, and create the list only in an explicit Server Action
when the first item is added or generation is requested.

### Low — Browser hardening headers are not configured

`next.config.ts` contains no configuration, and `netlify.toml` defines no
response headers. The app therefore does not explicitly set a Content Security
Policy, `frame-ancestors`, `X-Content-Type-Options`, or a referrer policy.

For a private financial and household app, framing protection is worthwhile,
and CSP reduces the impact of a future injection bug.

Recommendation: add and verify a deployment-compatible header set. Start with
`frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and a conservative
referrer policy. Build CSP from the actual Next.js and Supabase requirements;
do not ship an untested policy that breaks Server Actions, signed Storage
images, or authentication.

### Low — Documentation and verification hygiene have drifted

`README.md:6-7` says feature UI has not been built, although all seven V1
domains are implemented. This can mislead setup and maintenance work.

The current workspace also contains an untracked `.playwright-mcp/` directory.
Because it is not ignored, `npm run format:check` examines its generated YAML
and fails before lint, type-check, or tests run. This artifact is not an
application defect, but it makes the all-in-one verification command unreliable
after browser-review work.

Recommendation: update the README checkpoint and ignore known generated browser
artifacts, or scope the formatting command to tracked project files.

## Architecture and security assessment

### What is working well

- Product queries are confined to `lib/repositories/`; Client Components use
  the browser Supabase client only for auth session maintenance.
- The default server client uses the publishable key and user cookies, so
  Postgres RLS remains the normal authorization boundary.
- The secret-key admin client is server-only and used for provisioning rather
  than product repositories.
- Household IDs are present throughout the schema, and relationship-consistency
  triggers prevent cross-household recipe, meal, shopping, and budget links.
- RLS policies deny anonymous/non-member access and are backed by 114 pgTAP
  assertions, including cross-household and Storage cases.
- Recipe saving and grocery regeneration use `SECURITY INVOKER` RPCs, preserving
  RLS while making multi-row operations atomic.
- Secrets, local env files, credentials, and `private-data/` contents are
  ignored by Git.

### Remaining security priorities

In order:

1. Patch the audited dependency vulnerabilities.
2. Close the post-sign-in open redirect.
3. Add deployment security headers.
4. Add a regression test proving an unauthenticated request cannot reach each
   protected route after the framework upgrade.
5. Keep public sign-up disabled in every Supabase environment and periodically
   verify the intended shared household account is the only production member.

## Responsive and accessibility assessment

The layout is intentionally responsive rather than a shrunk desktop table:

- desktop uses a sidebar while narrow layouts use a safe-area-aware bottom nav;
- dense meal and calendar layouts have separate narrow presentations;
- forms become bottom sheets on phones and constrain height with `dvh`;
- important fields use visible labels and mutation buttons disable while saving;
- destructive recipe, transaction, subscription, meal, and calendar actions use
  confirmation UI; and
- automated overflow checks cover 320px, 360px, 390px, iPhone/WebKit, and
  iPad/WebKit scenarios.

The primary accessibility gap is target size, not horizontal layout. The test
suite checks accessible names and overflow but does not measure interactive
control dimensions. It also does not run an exact iPad landscape
1194×834/1366×1024 project, so the navigation breakpoint transition at 1120px
deserves an explicit test.

Recommended additions:

- exact 360×780 and 390×844 projects with touch-target checks;
- iPad portrait and landscape projects on both sides of the 1120px breakpoint;
- a keyboard-only dialog/sheet flow, including focus restoration;
- an automated accessibility scan for each main route and open form; and
- an iOS-keyboard-sized viewport test for more than the Budget form.

## Data and domain assessment

The domain design is appropriate for a two-person household:

- currency is persisted in integer cents;
- subscriptions preserve the original cadence while deriving monthly/annual
  equivalents;
- date-only database columns avoid UTC serialization shifts;
- recipe and grocery ingredient aggregation are kept out of React components;
- UUIDs are used consistently; and
- archive behavior preserves recipe and subscription references.

The main data risks are the timezone source, optimistic-concurrency omission,
and partial meal batches described above. A smaller consistency issue is that
some database constraints are looser than application validation—for example,
the original `transactions.amount_cents` constraint allows zero while the
domain schema requires a positive amount. Align database constraints with
write schemas where practical so a future API or script cannot persist states
the application cannot read.

## Test and verification results

Results from this review:

| Check                           | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| `npm run lint`                  | Passed                                                |
| `npm run typecheck`             | Passed when run after the build                       |
| `npm run test`                  | Passed: 169 tests in 9 files                          |
| `npm run build`                 | Passed                                                |
| Chromium Playwright             | Passed: 108 tests                                     |
| WebKit iPhone + iPad Playwright | Passed: 24 tests                                      |
| `npm run test:db` run 1         | Passed: 114 pgTAP tests                               |
| `npm run test:db` run 2         | Passed: 114 pgTAP tests                               |
| `npm audit --omit=dev`          | Failed: 3 high-severity production packages           |
| `npm run format:check`          | Blocked by untracked generated `.playwright-mcp` YAML |

The initial WebKit run could not launch because the current Playwright WebKit
binary was not installed. After installing the repository's expected browser
revision, both iPhone and iPad projects passed. The initial isolated type-check
was run concurrently with a build and observed the build replacing `.next/types`;
the sequential type-check and the build's own TypeScript phase both passed.

## Recommended remediation order

1. Patch Next.js and verify the advisory report is clean.
2. Make household-local date derivation explicit and test midnight/DST cases.
3. Fix and test the sign-in destination validator.
4. Add optimistic concurrency to editable and destructive records.
5. Make multi-day meal creation atomic.
6. validate month/date URL parameters before repository calls.
7. Normalize mobile touch targets and add automated size checks.
8. Remove the Shopping GET write.
9. Add security headers.
10. Refresh README and formatting-ignore hygiene.

After items 1–7, rerun `npm run verify`, both consecutive database tests, the
production build, and a hosted smoke pass before treating the release as
ready for household data.
