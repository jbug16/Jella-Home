# Deployment

Jella Home uses two environments: local development and production.

| Environment | Git branch       | Application URL                  | Database                   |
| ----------- | ---------------- | -------------------------------- | -------------------------- |
| Local       | any local branch | `http://127.0.0.1:3000`          | Local Supabase via Docker  |
| Production  | `main`           | `https://jella-home.netlify.app` | Hosted production Supabase |

Production deployment must be explicitly requested. Feature branches may use
temporary Netlify Deploy Previews when useful, but they must never receive
production Supabase credentials.

## Environment variables

| Variable                               | Visibility  | Local                         | Production                 |
| -------------------------------------- | ----------- | ----------------------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public      | Local API URL                 | Production project URL     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public      | Local publishable/anon key    | Production publishable key |
| `SUPABASE_SECRET_KEY`                  | Server-only | Local secret/service-role key | Production secret key      |
| `NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE`      | Public      | Household timezone            | Household timezone         |

- Keep local values in `.env.local`; it is gitignored.
- Keep production values in the Netlify production environment.
- Never expose `SUPABASE_SECRET_KEY` to browser code or a Deploy Preview.
- Never run `supabase/seed.sql` against production.

## Local verification

Before committing completed work:

```bash
npm run verify
npm run test:db
npm run build
git diff --check
```

Run `npm run test:db` twice consecutively when migrations or database behavior
changed. `npm run verify` includes formatting, lint, strict type checking, unit
tests, a production build, and the Playwright Chromium/WebKit suite.

## Production migration process

When a task includes a database migration:

1. Verify the migration with a local Supabase reset.
2. Run pgTAP twice consecutively without another reset.
3. Audit production data before destructive schema changes.
4. Review the linked migration list and use `supabase db push --dry-run`.
5. Apply only the expected forward migration with `supabase db push`.
6. Confirm local and remote migration parity.
7. Run Supabase Security and Performance Advisors.

Previously applied migrations are immutable. Never reset production or apply
the local fake seed to a hosted project.

## Production deployment process

Only after the user explicitly authorizes production:

1. Confirm the worktree and staged diff contain no secrets or private files.
2. Complete the canonical local verification gate.
3. Commit with an appropriate Conventional Commit message.
4. Push `main` to `origin`.
5. Confirm the Git-triggered Netlify production deploy reaches `ready` for the
   exact commit.
6. Verify sign-in, protected routes, changed flows, supported mobile/tablet
   layouts, runtime errors, and horizontal overflow on the live site.

## Rollback

Prefer a new revert commit on `main`; do not rewrite published history. Push the
revert only with explicit production authorization, wait for Netlify to deploy
it, and repeat the live verification. Database rollbacks require a new
forward-only migration and a production data audit.
