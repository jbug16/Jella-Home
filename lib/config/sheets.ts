/**
 * Centralized Google Sheets configuration.
 *
 * All sheet (tab) names, column mappings, and A1 ranges live here so that
 * strings like "Monthly Budget!B11" are never scattered across the codebase.
 * This is a stub for the foundation milestone; the real mappings are added in
 * Milestone 3 (Google Sheets foundation).
 */

/** Logical sheet/tab names, kept separate from their display strings. */
export const SHEET_NAMES = {} as const;

export type SheetName = keyof typeof SHEET_NAMES;
