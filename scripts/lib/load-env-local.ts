import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load KEY=VALUE pairs from `.env.local` into `process.env` when unset.
 * Does not override variables already present in the environment.
 */
export function loadEnvLocal(
  cwd = process.cwd(),
  fileName = ".env.local",
): void {
  const path = resolve(cwd, fileName);
  if (!existsSync(path)) {
    return;
  }

  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
