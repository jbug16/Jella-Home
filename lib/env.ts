import "server-only";

import {
  parseEnv,
  parsePublicSupabaseEnv,
  parseSecretSupabaseEnv,
  type Env,
  type PublicSupabaseEnv,
  type SecretSupabaseEnv,
} from "@/lib/config/env-schema";

/**
 * Server-only access to validated environment variables.
 *
 * Validation is lazy so a secret-less `next build` does not fail. Never log values.
 */

let cachedEnv: Env | null = null;
let cachedPublic: PublicSupabaseEnv | null = null;
let cachedSecret: SecretSupabaseEnv | null = null;

function formatErrors(errors: string[]): string {
  return `Invalid environment configuration:\n- ${errors.join("\n- ")}`;
}

/** Public Supabase URL + publishable key (SSR auth / repositories). */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  if (cachedPublic) {
    return cachedPublic;
  }

  const result = parsePublicSupabaseEnv(process.env);
  if (!result.success) {
    throw new Error(formatErrors(result.errors));
  }

  cachedPublic = result.data;
  return cachedPublic;
}

/** Secret key for provisioning/admin only. */
export function getSecretSupabaseEnv(): SecretSupabaseEnv {
  if (cachedSecret) {
    return cachedSecret;
  }

  const result = parseSecretSupabaseEnv(process.env);
  if (!result.success) {
    throw new Error(formatErrors(result.errors));
  }

  cachedSecret = result.data;
  return cachedSecret;
}

/** Full env (public + secret). Prefer the narrower getters when possible. */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = parseEnv(process.env);
  if (!result.success) {
    throw new Error(formatErrors(result.errors));
  }

  cachedEnv = result.data;
  cachedPublic = {
    NEXT_PUBLIC_SUPABASE_URL: result.data.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
  cachedSecret = { SUPABASE_SECRET_KEY: result.data.SUPABASE_SECRET_KEY };
  return cachedEnv;
}

/** Non-throwing public env read for proxy / graceful degradation. */
export function tryGetPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const result = parsePublicSupabaseEnv(process.env);
  return result.success ? result.data : null;
}
