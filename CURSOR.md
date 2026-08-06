# Cursor agent notes (Jella Home)

Read [`AGENTS.md`](AGENTS.md) for product and coding rules.
Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for local and production environments.

## Deployment rule

When an implementation task is **fully complete** (not mid-task):

1. Make the requested changes.
2. Run all relevant verification (`npm run verify`; `npm run test:db` twice if DB changed; build as needed).
3. Update documentation when required.
4. Commit completed work only when the user explicitly asks.
5. Push `main` and deploy production only when the user explicitly asks.
6. Confirm the automatic Netlify production deploy and verify the hosted app.
7. Return the production URL and a deployment report.

Do **not** push partial work, failing builds/tests/migrations, secrets, or `.env.local`.
Do **not** merge to `main` or deploy production unless the user explicitly asks.
