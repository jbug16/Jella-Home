# Cursor agent notes (Jella Home)

Read [`AGENTS.md`](AGENTS.md) for product and coding rules.
Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for environments and staging.

## Staging deployment rule (every completed implementation)

When an implementation task is **fully complete** (not mid-task):

1. Make the requested changes.
2. Run all relevant verification (`npm run verify`; `npm run test:db` twice if DB changed; build as needed).
3. Update documentation when required.
4. Commit completed work (only when the user asked to commit, or when the task explicitly includes committing as part of the staging workflow).
5. Merge or apply the work onto the `staging` branch.
6. Push `staging` to `origin` and confirm the automatic Netlify branch deploy.
7. Verify the hosted staging app at the stable URL.
8. Return the stable staging URL and a deployment report.

Stable staging URL: `https://staging--jella-home.netlify.app`

Do **not** push partial work, failing builds/tests/migrations, secrets, or `.env.local`.
Do **not** merge to `main` or deploy production unless the user explicitly asks.
Staging must use a dedicated staging Supabase project — never production data.
