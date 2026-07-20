import { spawn, spawnSync } from "node:child_process";

/**
 * Start `next dev` with local Supabase env vars forced over `.env.local`.
 * Prefer this for local UI work so meals/recipes hit the seeded local stack.
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

const localEnv = readLocalSupabaseEnv();
console.log("Starting Next.js on http://localhost:3000 (local Supabase)");

const child = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ...localEnv,
  },
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
