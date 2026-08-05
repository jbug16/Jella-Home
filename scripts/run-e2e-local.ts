import { spawnSync } from "node:child_process";

/**
 * Build + run Playwright against local Supabase (seeded Auth + budget data).
 * Rebuilds with local NEXT_PUBLIC_* so the Next.js proxy and server agree.
 */

function readLocalSupabaseEnv(): Record<string, string> {
  const result = spawnSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(
      `Unable to read local Supabase status. Is \`supabase start\` running?\n${result.stderr}`,
    );
  }

  const env: Record<string, string> = {};
  for (const line of result.stdout.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1]!;
    let value = match[2]!;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  const url = env.API_URL ?? env.SUPABASE_URL;
  const publishable =
    env.PUBLISHABLE_KEY ?? env.ANON_KEY ?? env.SUPABASE_ANON_KEY;
  const secret =
    env.SECRET_KEY ?? env.SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publishable || !secret) {
    throw new Error(
      "Local Supabase env missing API URL / publishable / secret keys.",
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_SECRET_KEY: secret,
  };
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

const localEnv = {
  ...process.env,
  ...readLocalSupabaseEnv(),
  E2E_EMAIL: process.env.E2E_EMAIL ?? "member-a@example.test",
  E2E_PASSWORD: process.env.E2E_PASSWORD ?? "local-dev-password",
  // Shared local DB: keep budget mutations from racing across workers/projects.
  PLAYWRIGHT_WORKERS: process.env.PLAYWRIGHT_WORKERS ?? "1",
};

// Apply any pending local migrations (e.g. new RPCs) before building/tests.
run("npx", ["supabase", "migration", "up", "--local"], localEnv);

// Ensure proxy/middleware is compiled against the same Supabase project used at runtime.
// Next 16 defaults to Turbopack builds, which do not produce a `next start`-ready
// `.next` output — use webpack for Playwright's production server.
if (process.env.E2E_SKIP_BUILD !== "1") {
  run("npx", ["next", "build", "--webpack"], localEnv);
}

// Attach fixture recipe cover so Dashboard meal thumbnails are testable.
run("npx", ["tsx", "scripts/prepare-dashboard-demo.ts", "--image"], localEnv);

const playwrightArgs = process.argv.slice(2);
run("npx", ["playwright", "test", ...playwrightArgs], localEnv);
