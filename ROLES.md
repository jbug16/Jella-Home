# Jella Home: Agent Roles

This file defines specialist responsibilities for Cursor agents and subagents. `AGENTS.md` remains the authority for product, architecture, security, UX, and testing rules.

## Operating model

Use one lead agent to own each milestone. Specialists primarily review plans, inspect focused areas, and implement isolated tasks. Do not allow multiple agents to edit overlapping files at the same time.

Preferred sequence:

1. Lead reads `AGENTS.md`, `ROLES.md`, and `IMPLEMENTATION.md`.
2. Lead selects one milestone or vertical slice.
3. Lead requests targeted reviews from relevant specialists.
4. Lead reconciles the findings into one plan.
5. One agent implements each isolated task.
6. QA validates the completed flow.
7. Lead reviews the final diff, resolves conflicts, and updates `IMPLEMENTATION.md`.

Use separate worktrees or branches for parallel implementation. Parallel review work does not require separate worktrees when agents are not editing files.

## Lead Engineer

Owns the milestone from planning through integration.

Responsibilities:

- Read all project guidance before making changes.
- Inspect the current repository and existing conventions.
- Choose the smallest complete vertical slice.
- Delegate only focused, non-overlapping work.
- Reconcile specialist feedback and make final architectural decisions.
- Prevent unnecessary abstractions, dependencies, and scope expansion.
- Review every resulting diff before accepting it.
- Run or verify linting, type checking, tests, production build, and browser checks.
- Update `IMPLEMENTATION.md` with completed work, decisions, risks, and next steps.

The lead is the only role that may declare a milestone complete.

## Frontend and UI Specialist

Owns interface quality, responsive behavior, usability, and accessibility review.

Responsibilities:

- Use shadcn/ui before creating custom primitives.
- Review layout hierarchy, navigation, forms, tables, dialogs, drawers, and interaction states.
- Verify desktop, iPad, iPhone 13 Pro, and iPhone 12 mini behavior.
- Ensure no horizontal scrolling at 360px.
- Ensure touch targets, labels, keyboard navigation, focus states, and contrast are usable.
- Check loading, empty, success, validation, and error states.
- Prefer simple household-friendly interfaces over spreadsheet-like density.
- Identify visual inconsistencies and duplicated UI patterns.

This role may implement isolated components or pages when file ownership is clearly assigned by the lead.

## Backend and Data Specialist

Owns server architecture, Google Sheets integration, validation, and data correctness review.

Responsibilities:

- Keep Google credentials and Sheets access server-side.
- Maintain separation between low-level Sheets access, repositories, domain schemas, and UI.
- Centralize sheet names, columns, and range mappings.
- Use stable domain IDs rather than row numbers or display names.
- Validate all writes with Zod.
- Review concurrency, destructive updates, revalidation, and error handling.
- Keep financial values currency-safe and date-only records timezone-safe.
- Prevent private data, tokens, or credentials from appearing in logs or client bundles.
- Add focused tests for mappings and calculations.

This role covers database concerns while Google Sheets remains the datastore. Add a separate database role only if the app migrates to a real database.

## QA and Integration Specialist

Owns verification, regression coverage, and release-readiness review.

Responsibilities:

- Derive acceptance criteria from the selected milestone.
- Test critical user flows with Playwright.
- Verify desktop and supported mobile/tablet viewports.
- Check form validation, duplicate submission protection, destructive confirmations, and recoverable errors.
- Test financial calculations, meal dates, shopping aggregation, subscription cadence conversions, and repository mappings where relevant.
- Run lint, type checking, unit tests, integration tests, and production build.
- Report failures with reproduction steps and likely ownership.
- Do not silently modify product behavior to make a test pass.

QA may implement tests in isolated test files. Product-code fixes should normally return to the owning implementation agent or lead.

## Optional specialists

Create these only when a milestone clearly requires them:

- Security reviewer: authentication, authorization, secret handling, deployment exposure.
- DevOps reviewer: hosting, environment variables, CI, monitoring, backups.
- Mobile/PWA reviewer: installability, offline behavior, app manifests, native-client planning.

Do not create permanent specialist roles for small one-off concerns.

## Delegation rules

Good delegated tasks:

- Review a proposed meal-planner layout at the supported viewports.
- Implement a recipe repository in an isolated module.
- Write Playwright coverage for adding and editing an expense.
- Audit a server action for validation and credential leakage.

Bad delegated tasks:

- Build the entire budget feature independently while another agent edits the same feature.
- Redesign the whole application during a focused bug fix.
- Create a second architecture because the existing one is unfamiliar.
- Merge or declare work complete without lead review.
