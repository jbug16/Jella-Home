import { z } from "zod";

/**
 * Pure environment parsing and validation.
 *
 * This module is deliberately free of any server-only imports or access to
 * `process.env` so it can be unit-tested in isolation. `lib/env.ts` wraps it
 * with the `server-only` guard and reads `process.env` lazily.
 *
 * None of these variables are consumed by Milestone 1 features; they document
 * the shape required by later milestones (authentication in M2, Google Sheets
 * in M3). Validation is therefore never triggered during `next build`.
 */

/**
 * Google service-account private keys are commonly stored in a single-line,
 * double-quoted env value with escaped newlines (`\n`). Convert those back to
 * real newlines so the key is usable by the Google auth libraries later.
 */
export function normalizePrivateKey(rawKey: string): string {
  return rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
}

/**
 * Parse a comma-separated allowlist into a normalized, de-duplicated list of
 * lower-cased email addresses.
 */
export function parseAllowlist(rawAllowlist: string): string[] {
  const emails = rawAllowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return Array.from(new Set(emails));
}

export const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.email({
    message: "GOOGLE_SERVICE_ACCOUNT_EMAIL must be a valid email address",
  }),
  GOOGLE_PRIVATE_KEY: z
    .string()
    .min(1, "GOOGLE_PRIVATE_KEY is required")
    .transform(normalizePrivateKey),
  GOOGLE_SHEETS_SPREADSHEET_ID: z
    .string()
    .min(1, "GOOGLE_SHEETS_SPREADSHEET_ID is required"),
  AUTH_ALLOWLIST: z
    .string()
    .min(1, "AUTH_ALLOWLIST is required")
    .transform(parseAllowlist)
    .refine((emails) => emails.length > 0, {
      message: "AUTH_ALLOWLIST must contain at least one email address",
    }),
});

export type Env = z.infer<typeof envSchema>;

export type ParseEnvResult =
  { success: true; data: Env } | { success: false; errors: string[] };

/**
 * Validate an arbitrary env-like record. Returns a discriminated result rather
 * than throwing so callers can decide how to react. Never returns or logs the
 * raw values on failure, only the offending variable names and messages.
 */
export function parseEnv(source: Record<string, unknown>): ParseEnvResult {
  const result = envSchema.safeParse(source);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });

  return { success: false, errors };
}
