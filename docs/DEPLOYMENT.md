# Deployment and environments

Jella Home uses **Netlify** for hosting and **Supabase** for Auth + Postgres.
There is no Vercel or other host configured.

This document covers environment separation, the staging workflow, migrations,
test accounts, verification, and rollback. Never put secret values in Git,
logs, docs, screenshots, or chat transcripts.

## Environment map

| Environment       | Git branch                      | App URL                                  | Backend                                       |
| ----------------- | ------------------------------- | ---------------------------------------- | --------------------------------------------- |
| Local development | feature branches / local `main` | `http://127.0.0.1:3000`                  | Local Supabase (`supabase start`)             |
| Staging (test)    | `staging`                       | `https://jella-home-staging.netlify.app` | Dedicated hosted Supabase **staging** project |
| Production        | `main`                          | `https://jella-home.netlify.app`         | Hosted Supabase project `jella-home`          |

Rules:

- `main` is production-ready only. Do not merge to `main` or deploy production
  unless explicitly requested.
- `staging` is the always-deployed test environment for phones, tablets, and
  desktops outside the local network.
- Feature branches may use temporary Netlify Deploy Previews when enabled; the
  stable test destination is always the staging URL above.
- Staging must **never** use the production Supabase project or production data.

## Provider configuration

| Item               | Value                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| Production host    | Netlify site `jella-home` (`50d77854-6a11-4ca2-b05d-2d406323bda3`)         |
| Staging host       | Netlify site `jella-home-staging` (`9cc03442-3122-467b-b57e-7e0f75ab06c9`) |
| Production branch  | `main` → `https://jella-home.netlify.app`                                  |
| Staging branch     | `staging` → `https://jella-home-staging.netlify.app`                       |
| Node               | `24` (`.nvmrc` + `netlify.toml`)                                           |
| Production build   | `npm run build` via `@netlify/plugin-nextjs`                               |
| Staging build gate | format check, lint, typecheck, unit tests, then build                      |

### Why two Netlify sites?

The GitHub → Netlify integration for production currently uses a **build hook**.
Build hooks always rebuild the site’s production branch (`main`). They do **not**
create branch deploys for `staging`. Pushes to `staging` previously triggered an
unwanted production rebuild.

Staging therefore uses a dedicated Netlify site. Continuous deploy for staging
runs via GitHub Actions (`.github/workflows/deploy-staging.yml`) using repository
secret `NETLIFY_AUTH_TOKEN`.

Production continues to deploy from the existing production build hook on
`main`. Do not point the staging site at production Supabase keys.

**Known quirk:** the production GitHub webhook targets a Netlify build hook, so
pushes to `staging` may still trigger a production rebuild of the current
`main` tip (no code change). Preferred follow-up: reconnect Netlify with the
GitHub App (branch-aware) or move production deploys to an Actions workflow
that only runs on `main`, then remove the build-hook webhook.

## Required environment variables (names only)

| Variable                               | Visibility  | Local                     | Staging             | Production             |
| -------------------------------------- | ----------- | ------------------------- | ------------------- | ---------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public      | Local API URL             | Staging project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public      | Local publishable/anon    | Staging publishable | Production publishable |
| `SUPABASE_SECRET_KEY`                  | Server-only | Local secret/service_role | Staging secret      | Production secret      |

Netlify scoping:

- Production site (`jella-home`): Supabase keys in context `production` only.
- Staging site (`jella-home-staging`): Supabase keys in that site’s `production`
  context only (staging is that site’s primary deploy).
- Do **not** share production Supabase keys with the staging site.
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
do **not** point the Netlify staging site at production Supabase.

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
   - Site URL: `https://jella-home-staging.netlify.app`
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

6. Set Netlify env vars on site **`jella-home-staging`** (staging dashboard
   values only):

```bash
npx netlify env:set NEXT_PUBLIC_SUPABASE_URL "<staging-url>" --site jella-home-staging --context production --force
npx netlify env:set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "<staging-publishable>" --site jella-home-staging --context production --force
npx netlify env:set SUPABASE_SECRET_KEY "<staging-secret>" --site jella-home-staging --context production --secret --force
```

7. Confirm production site (`jella-home`) vars remain production-only and still
   point at the production Supabase project.

8. Add GitHub Actions secret `NETLIFY_AUTH_TOKEN` (Netlify personal access token)
   so `.github/workflows/deploy-staging.yml` can deploy on every `staging` push.

9. Push to `staging` (or re-run the workflow) and confirm
   `https://jella-home-staging.netlify.app` is healthy.

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
6. Wait for the staging GitHub Action / Netlify deploy to succeed.
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

The staging deploy workflow also runs format/lint/typecheck/unit tests before
`netlify deploy --build`. It does **not** run Playwright or `test:db`.

Fix in-scope failures before push. Report unrelated pre-existing failures
separately and do not deploy on required-check failure.

## Post-deploy verification

A green Netlify status is not enough. After deploy, confirm:

1. `https://jella-home-staging.netlify.app` loads over HTTPS.
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
npm run verify:staging -- --url https://jella-home-staging.netlify.app
```

## Deployment report template

After each completed task pushed to staging:

```text
Staging deployment

Branch: staging
Commit: <hash>
Checks: passed | failed (<which>)
Database migrations: in sync | pending | blocked (<reason>)
Provider: Netlify (jella-home-staging)
Deployment: successful | failed
Test URL: https://jella-home-staging.netlify.app
Verified: <routes / flows>
Production changed: no
```

## Rollback (staging)

1. Identify the last known-good staging deploy in Netlify → site
   `jella-home-staging` → Deploys (state `ready`), or via `git log origin/staging`.
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
- Avoid relying on the production build hook for non-`main` branches; staging
  pushes should deploy only via the staging site / Actions workflow.
