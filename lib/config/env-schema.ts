import { z } from "zod";

/**
 * Pure environment parsing and validation.
 *
 * Free of server-only imports and `process.env` access so it can be unit-tested.
 * `lib/env.ts` and `lib/supabase/env.ts` compose these parsers with runtime access.
 */

const nonEmptyString = z.string().min(1, "value is required");

/** Public Supabase values used by browser + cookie-backed SSR clients. */
export const publicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmptyString,
});

/** Secret key for provisioning/admin only. Never expose to the client. */
export const secretSupabaseEnvSchema = z.object({
  SUPABASE_SECRET_KEY: nonEmptyString,
});

export const envSchema = publicSupabaseEnvSchema.merge(secretSupabaseEnvSchema);

export type PublicSupabaseEnv = z.infer<typeof publicSupabaseEnvSchema>;
export type SecretSupabaseEnv = z.infer<typeof secretSupabaseEnvSchema>;
export type Env = z.infer<typeof envSchema>;

export type ParseEnvResult<T> =
  { success: true; data: T } | { success: false; errors: string[] };

function toParseResult<T>(
  result: { success: true; data: T } | { success: false; error: z.ZodError },
): ParseEnvResult<T> {
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });

  return { success: false, errors };
}

export function parsePublicSupabaseEnv(
  source: Record<string, unknown>,
): ParseEnvResult<PublicSupabaseEnv> {
  return toParseResult(publicSupabaseEnvSchema.safeParse(source));
}

export function parseSecretSupabaseEnv(
  source: Record<string, unknown>,
): ParseEnvResult<SecretSupabaseEnv> {
  return toParseResult(secretSupabaseEnvSchema.safeParse(source));
}

/**
 * Validate the full server env (public + secret). Used by admin/provisioning
 * paths. Auth/SSR paths should prefer `parsePublicSupabaseEnv`.
 */
export function parseEnv(source: Record<string, unknown>): ParseEnvResult<Env> {
  return toParseResult(envSchema.safeParse(source));
}
