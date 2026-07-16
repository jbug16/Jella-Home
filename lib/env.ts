import "server-only";

import { parseEnv, type Env } from "@/lib/config/env-schema";

/**
 * Server-only access to validated environment variables.
 *
 * The `server-only` import guarantees this module (and the secrets it reads)
 * can never be bundled into client code. Validation is lazy: it runs on first
 * access, not at import time, so a secret-less `next build` or CI run does not
 * fail. Values are cached after the first successful parse.
 */
let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) {
    return cached;
  }

  const result = parseEnv(process.env);

  if (!result.success) {
    // Report offending variable names only. Never log secret values.
    throw new Error(
      `Invalid environment configuration:\n- ${result.errors.join("\n- ")}`,
    );
  }

  cached = result.data;
  return cached;
}
