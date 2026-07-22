# Deployment and environments

Jella Home uses **Netlify** for hosting and **Supabase** for Auth + Postgres.
There is no Vercel or other host configured.

This document covers environment separation, the staging workflow, migrations,
test accounts, verification, and rollback. Never put secret values in Git,
logs, docs, screenshots, or chat transcripts.

## Environment map

| Environment       | Git branch                      | App URL                                   | Backend                                       |
| ----------------- | ------------------------------- | ----------------------------------------- | --------------------------------------------- |
| Local development | feature branches / local `main` | `http://127.0.0.1:3000`                   | Local Supabase (`supabase start`)             |
| Staging (test)    | `staging`                       | `https://staging--jella-home.netlify.app` | Dedicated hosted Supabase **staging** project |
| Production        | `main`                          | `https://jella-home.netlify.app`          | Hosted Supabase project `jella-home`          |

Rules:

- `main` is production-ready only. Do not merge to `main` or deploy production
  unless explicitly requested.
- `staging` is the always-deployed test environment for phones, tablets, and
  desktops outside the local network.
- Feature branches may use temporary Netlify Deploy Previews when enabled; the
  stable test destination is always the `staging` URL above.
- Staging must **never** use the production Supabase project or production data.

## Provider configuration

| Item               | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| Host               | Netlify site `jella-home`                             |
| Site ID            | `50d77854-6a11-4ca2-b05d-2d406323bda3`                |
| Production branch  | `main`                                                |
| Staging branch     | `staging` (branch deploy)                             |
| Node               | `24` (`.nvmrc` + `netlify.toml`)                      |
| Build              | `npm run build` via `@netlify/plugin-nextjs`          |
| Staging build gate | format check, lint, typecheck, unit tests, then build |

Netlify is connected to GitHub (`jbug16/Jella-Home`). Pushes to `staging`
trigger an automatic branch deploy. Pushes to `main` trigger production.

Allowed branches for automatic builds: `main`, `staging`.

## Required environment variables (names only)

| Variable                               | Visibility  | Local                     | Staging             | Production             |
| -------------------------------------- | ----------- | ------------------------- | ------------------- | ---------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public      | Local API URL             | Staging project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public      | Local publishable/anon    | Staging publishable | Production publishable |
| `SUPABASE_SECRET_KEY`                  | Server-only | Local secret/service_role | Staging secret      | Production secret      |

Netlify scoping:

- Production values: Netlify context `production` only.
- Staging values: Netlify context `branch:staging` only.
- Do **not** set Supabase keys for “all contexts”.
- Never prefix the secret key with `NEXT_PUBLIC_`.

Provisioning / verification scripts may also use shell-only vars such as
`PROVISION_*` and `VERIFY_*` (see [HOSTED_SUPABASE.md](HOSTED_SUPABASE.md)).
Those are not required for the Netlify build.

## Local environment

1. `nvm use` (Node 24)
2. `npm ci`
3. `cp .env.example .env.local` and fill from `npx supabase status -o env`
4. `npm run supabase:start` then `npm run supabase:reset`
5. `npm run dev` or `npm run dev:local`

Local seed users (fake only; from `supabase/seed.sql`):

| Email                   | Password             |
| ----------------------- | -------------------- |
| `member-a@example.test` | `local-dev-password` |
| `member-b@example.test` | `local-dev-password` |

Never run `supabase/seed.sql` against hosted staging or production.

## Staging Supabase setup (manual gate)

A dedicated staging Supabase project is required before the staging site can
authenticate or load household data.

### Current blocker

Creating `jella-home-staging` via the API failed because the free-plan account
has reached its **active free project limit**. Until a staging project exists,
do **not** point the Netlify `staging` deploy at production Supabase.

### Create the staging project

Choose one path:

1. **Preferred:** Free up a free-project slot (pause or delete an unused project
   elsewhere under the same Supabase account), then create a new project named
   `jella-home-staging` in region `us-east-2`.
2. Upgrade the Supabase org to a plan that allows another project.
3. Optional paid alternative: Supabase database branching on the production
   project (~hourly compute). Prefer a separate project when possible.

Then:

1. Auth → Email: enable password sign-in; **disable public sign-up**.
2. Auth → Sessions: leave multi-device sessions allowed (same as production).
3. Auth → URL configuration:
   - Site URL: `https://staging--jella-home.netlify.app`
   - Redirect allowlist: include that origin (and local if you test against it).
4. Link and push migrations:

```bash
npx supabase link --project-ref <staging-project-ref>
npx supabase db push
npx supabase migration list
```

5. Provision a **staging-only** shared login (password manager; never commit):

```bash
# Point .env.local at staging keys temporarily, or export staging keys in the shell
export PROVISION_HOUSEHOLD_NAME="Staging Home"
export PROVISION_MEMBER_1_EMAIL="..."   # staging-only address
export PROVISION_MEMBER_1_PASSWORD="..."
export PROVISION_MEMBER_1_DISPLAY_NAME="Household"
npm run provision:household
```

6. Set Netlify staging env vars (values from the staging dashboard only):

```bash
npx netlify env:set NEXT_PUBLIC_SUPABASE_URL "<staging-url>" --context branch:staging --force
npx netlify env:set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "<staging-publishable>" --context branch:staging --force
npx netlify env:set SUPABASE_SECRET_KEY "<staging-secret>" --context branch:staging --secret --force
```

7. Confirm production vars remain scoped to `--context production` only.

8. Trigger a staging redeploy (push an empty commit to `staging`, or Redeploy in
   the Netlify UI for the latest `staging` deploy).

### Staging sign-in (no credentials in Git)

- Use the staging shared login stored in your password manager.
- Or re-run `npm run provision:household` against staging if you need to rotate
  the password.
- Local seed passwords are for Docker/local only and will not work on staging
  unless you intentionally provision matching users there (not recommended).

## Production Supabase

- Project name: `jella-home`
- Ref: `ggyvfkgeudcqbozlsify`
- Runbook: [HOSTED_SUPABASE.md](HOSTED_SUPABASE.md)
- Migrations are applied with `npx supabase link` + `npx supabase db push`
- Never reset production. Never seed fake users into production.

## Branch and agent workflow

After an implementation task is **complete and verified**:

1. Run verification (see below).
2. Update docs when required.
3. Commit completed work (Conventional Commits).
4. Merge or cherry-pick onto `staging` (do not leave unfinished work there).
5. Push `staging` to `origin`.
6. Wait for the Netlify staging deploy to become `ready`.
7. Verify the live staging URL (smoke checks below).
8. Report the staging URL and deployment status.

Do **not** push:

- partial or knowingly broken work
- failing migrations or required tests
- secrets, `.env.local`, or temporary debug code

Do **not** merge to `main` or deploy production without an explicit request.

## Pre-deploy verification

Canonical local gate before pushing to `staging`:

```bash
npm run verify
npm run test:db   # when migrations or DB/RLS code changed; pass twice consecutively
npm run build     # included via e2e path in verify; run explicitly if needed
```

`npm run verify` runs: `format:check`, `lint`, `typecheck`, `test` (Vitest), and
`test:e2e` (Playwright against the production build with local Supabase).

Netlify’s `staging` context also runs format/lint/typecheck/unit tests before
`build`. It does **not** run Playwright or `test:db` (those need local Supabase).

Fix in-scope failures before push. Report unrelated pre-existing failures
separately and do not deploy on required-check failure.

## Post-deploy verification

A green Netlify status is not enough. After deploy, confirm:

1. `https://staging--jella-home.netlify.app` loads over HTTPS.
2. Unauthenticated visitors redirect to sign-in (protected routes stay protected).
3. Staging test user can sign in; app shell renders.
4. No missing-env or redirect-loop errors.
5. Static assets load; no obvious runtime exceptions.
6. Changed routes for the task work (server actions + Supabase queries).
7. Responsive checks at 320, 360, 390, tablet portrait/landscape, and desktop.
8. When Calendar changed: `/calendar`, Week, Month, create/edit/delete, mobile
   selected-day, Dashboard Today, subscription-derived entries.

Optional automated probe (expects a reachable URL; does not bypass auth):

```bash
npm run verify:staging -- --url https://staging--jella-home.netlify.app
```

## Deployment report template

After each completed task pushed to staging:

```text
Staging deployment

Branch: staging
Commit: <hash>
Checks: passed | failed (<which>)
Database migrations: in sync | pending | blocked (<reason>)
Provider: Netlify
Deployment: successful | failed
Test URL: https://staging--jella-home.netlify.app
Verified: <routes / flows>
Production changed: no
```

## Rollback (staging)

1. Identify the last known-good staging deploy in Netlify → Deploys (filter
   branch `staging`, state `ready`) or via `git log origin/staging`.
2. Prefer one of:
   - Netlify UI → open the good deploy → **Publish deploy** / rollback, or
   - `git revert` the bad commit on `staging` and push, or
   - reset `staging` to the good commit and force-push **only** if explicitly
     requested (never force-push `main`).
3. Re-run post-deploy verification on the staging URL.
4. Leave `main` / production untouched unless asked.

## Production safety

- Production URL: `https://jella-home.netlify.app`
- Production deploy only from `main`, and only when explicitly requested.
- Do not copy staging data into production or vice versa.
- Do not run destructive `db reset` against hosted projects.
- Keep public sign-up disabled in every hosted Auth project.
