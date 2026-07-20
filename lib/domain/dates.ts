import { z } from "zod";

/** Date-only calendar strings (YYYY-MM-DD). Never parse as UTC midnight. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

/** Today's date as YYYY-MM-DD in the local calendar (no UTC shift). */
export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a local Date as YYYY-MM-DD. */
export function formatIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * True when `isoDate` is YYYY-MM-DD and names a real local calendar day
 * (rejects month/day overflow like 2026-13-01).
 */
export function isValidIsoDate(isoDate: string): boolean {
  if (!isoDateSchema.safeParse(isoDate).success) {
    return false;
  }
  const [yearText, monthText, dayText] = isoDate.split("-");
  const date = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
  );
  return formatIsoDateLocal(date) === isoDate;
}

/** Parse YYYY-MM-DD into a local-calendar Date at local midnight. */
export function parseIsoDateLocal(isoDate: string): Date {
  const parsed = isoDateSchema.parse(isoDate);
  if (!isValidIsoDate(parsed)) {
    throw new Error("Use a valid calendar date (YYYY-MM-DD).");
  }
  const [yearText, monthText, dayText] = parsed.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

/** Add `delta` calendar days to a YYYY-MM-DD string. */
export function addDays(isoDate: string, delta: number): string {
  const date = parseIsoDateLocal(isoDate);
  date.setDate(date.getDate() + delta);
  return formatIsoDateLocal(date);
}
