#!/usr/bin/env bash
# Deploy the current commit to the dedicated staging Netlify site.
# Does not deploy production (jella-home).
#
# Usage (from repo root, Netlify CLI already logged in):
#   ./scripts/deploy-staging.sh
#
# Or:
#   npm run deploy:staging

set -euo pipefail

SITE_ID="${NETLIFY_SITE_ID:-9cc03442-3122-467b-b57e-7e0f75ab06c9}"
SHA="$(git rev-parse --short HEAD)"

echo "Deploying $(git rev-parse --abbrev-ref HEAD)@$SHA to Netlify site $SITE_ID"
echo "Stable URL: https://jella-home-staging.netlify.app"
echo

NETLIFY_SITE_ID="$SITE_ID" npx --yes netlify-cli deploy \
  --build \
  --prod \
  --message "staging $SHA"

echo
echo "Smoke check:"
npm run verify:staging -- --url https://jella-home-staging.netlify.app
