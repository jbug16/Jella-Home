# Hosted Supabase runbook

This runbook covers creating a hosted project, linking the CLI, pushing
migrations, provisioning the household, and switching between local and hosted
development. Never commit real emails, passwords, or API keys.

## Create a hosted project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. **New project** → choose organization → name it (e.g. `jella-home`).
3. Set a strong database password (store in a password manager; not in git).
4. Pick a region close to you / Netlify.
5. Wait until the project is healthy.

### Auth settings (required)

In **Authentication → Providers → Email**:

- Enable Email provider.
- **Disable** “Allow new users to sign up” (or equivalent public sign-up toggle).
  Confirm with a probe `signUp` from the publishable key — it must fail with a
  sign-ups-disabled style error, not create an Auth user.
- Password sign-in must remain enabled.

In **Authentication → URL configuration**:

- Site URL: your app origin (local `http://127.0.0.1:3000` while developing;
  production Netlify URL for deploy).
- Add redirect URLs for local and production origins as needed.

### API keys

From **Project Settings → API Keys** (current key model):

| Dashboard value | App env var                            |
| --------------- | -------------------------------------- |
| Project URL     | `NEXT_PUBLIC_SUPABASE_URL`             |
| Publishable key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key      | `SUPABASE_SECRET_KEY` (server-only)    |

Do not put the secret key in `NEXT_PUBLIC_*` or Netlify client-exposed vars.

## Link the CLI and push migrations

```bash
# One-time: authenticate the CLI (browser or access token)
npx supabase login

# Link this repo to the hosted project (project ref from dashboard URL)
npx supabase link --project-ref <project-ref>

# Push schema + RLS migrations (never seeds real users)
npx supabase db push

# Confirm migration history
npx supabase migration list
```

Optional: regenerate types from hosted schema:

```bash
npx supabase gen types typescript --linked > lib/supabase/database.types.ts
```

## Advisors

```bash
npm run supabase:advisors
# equivalent: npx supabase db advisors --linked --type all
```

Resolve security findings before treating the backend as production-ready.
Document accepted performance findings if they are informational only.

## Provision the household (two members)

Do **not** put real users in SQL migrations or committed seeds.

1. Put hosted keys in `.env.local` (gitignored).
2. Export provision inputs in the shell (or a private, untracked env file):

```bash
export PROVISION_HOUSEHOLD_NAME="Our Home"
export PROVISION_MEMBER_1_EMAIL="..."
export PROVISION_MEMBER_1_PASSWORD="..."
export PROVISION_MEMBER_1_DISPLAY_NAME="..."
export PROVISION_MEMBER_2_EMAIL="..."
export PROVISION_MEMBER_2_PASSWORD="..."
export PROVISION_MEMBER_2_DISPLAY_NAME="..."
```

3. Run:

```bash
npm run provision:household
# → prints householdId and memberUserIds only
```

Both members receive equal read/write via identical RLS policies. The `role`
column (`owner` / `member`) is reserved for future bootstrap distinctions and
does not change V1 data permissions.

## Add another member later

```bash
export PROVISION_HOUSEHOLD_ID="<household-uuid>"
export PROVISION_MEMBER_EMAIL="..."
export PROVISION_MEMBER_PASSWORD="..."
export PROVISION_MEMBER_DISPLAY_NAME="..."
# optional: PROVISION_MEMBER_ROLE=member
npm run provision:add-member
```

V1 schema allows only one household per Auth user (`UNIQUE (user_id)` on
`household_members`).

## Local vs hosted development

| Mode   | Docker / Colima | Command highlights                      | `.env.local` source          |
| ------ | --------------- | --------------------------------------- | ---------------------------- |
| Local  | Required        | `supabase start`, `db reset`, `test:db` | `supabase status` keys       |
| Hosted | Not required    | `db push`, advisors, provision scripts  | Dashboard publishable/secret |

Local notes:

- Analytics is disabled in `supabase/config.toml` for Colima compatibility.
- `supabase/seed.sql` creates **fake** users for RLS tests only.

Hosted notes:

- Never run the fake seed against production.
- Keep public sign-up disabled.
- Set the same three env vars on Netlify for deploy (secret as server-only).

## Verify after cutover

```bash
npm run verify
npm run test:db          # local stack only
npx supabase migration list
npm run supabase:advisors
```

Manual checks:

1. Sign in as member 1 → shell loads.
2. Sign in as member 2 → same household data visible.
3. Sign in as an Auth user with no `household_members` row → `/not-provisioned`.
4. Confirm a non-member cannot read household rows (RLS).
