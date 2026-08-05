import { z } from "zod";

import { toVersionTimestamp } from "@/lib/domain/timestamps";

/** Household-friendly message when a concurrent edit wins. */
export const CONCURRENCY_CONFLICT_MESSAGE =
  "This changed on another device. Review the latest version and try again.";

/** Expected `updated_at` from the form/version the user started editing. */
export const expectedUpdatedAtSchema = z
  .string()
  .min(1, "Missing version. Reload and try again.")
  .transform((value) => toVersionTimestamp(value.trim()));

export class ConcurrencyConflictError extends Error {
  constructor(message = CONCURRENCY_CONFLICT_MESSAGE) {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

export function isConcurrencyConflictError(
  error: unknown,
): error is ConcurrencyConflictError {
  return error instanceof ConcurrencyConflictError;
}
