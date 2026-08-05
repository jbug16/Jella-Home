import { z } from "zod";

/** Default household calendar timezone for V1 (US East). */
export const DEFAULT_HOUSEHOLD_TIME_ZONE = "America/New_York";

/**
 * Explicit household timezone for date-only “today” and period defaults.
 * Public so client components can use the same calendar day as the server.
 */
export function getHouseholdTimeZone(): string {
  const fromEnv = process.env.NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_HOUSEHOLD_TIME_ZONE;
}

const isoDateShapeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

/**
 * True when `isoDate` is YYYY-MM-DD and names a real calendar day
 * (rejects month/day overflow like 2026-13-01).
 */
export function isValidIsoDate(isoDate: string): boolean {
  if (!isoDateShapeSchema.safeParse(isoDate).success) {
    return false;
  }
  const [yearText, monthText, dayText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return formatIsoDateLocal(date) === isoDate;
}

/** Date-only calendar strings (YYYY-MM-DD). Rejects non-existent calendar days. */
export const isoDateSchema = z
  .string()
  .refine(isValidIsoDate, "Use a valid calendar date (YYYY-MM-DD).");

/** Calendar month strings (YYYY-MM). Rejects month 00 / 13 / 99. */
export function isValidIsoMonth(isoMonth: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(isoMonth)) {
    return false;
  }
  return isValidIsoDate(`${isoMonth}-01`);
}

export const isoMonthSchema = z
  .string()
  .refine(isValidIsoMonth, "Use a valid calendar month (YYYY-MM).");

/**
 * Today's date as YYYY-MM-DD in the household timezone (not the server TZ).
 */
export function todayIsoDate(
  now = new Date(),
  timeZone = getHouseholdTimeZone(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Format a calendar Date's Y/M/D components as YYYY-MM-DD. */
export function formatIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse YYYY-MM-DD into a local-calendar Date at local midnight. */
export function parseIsoDateLocal(isoDate: string): Date {
  const parsed = isoDateSchema.parse(isoDate);
  const [yearText, monthText, dayText] = parsed.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

/** Add `delta` calendar days to a YYYY-MM-DD string. */
export function addDays(isoDate: string, delta: number): string {
  const date = parseIsoDateLocal(isoDate);
  date.setDate(date.getDate() + delta);
  return formatIsoDateLocal(date);
}

/** Signed calendar-day difference: `toIso - fromIso` (local date-only). */
export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const from = parseIsoDateLocal(fromIso);
  const to = parseIsoDateLocal(toIso);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Format YYYY-MM-DD as US MM-DD-YYYY. */
export function formatIsoDateUs(isoDate: string): string {
  const parsed = isoDateSchema.parse(isoDate);
  const [year, month, day] = parsed.split("-");
  return `${month}-${day}-${year}`;
}

/**
 * Relative day phrase vs `todayIso`: "today", "tomorrow", "in N days",
 * or "N day(s) ago" when past.
 */
export function formatRelativeDayPhrase(
  targetIso: string,
  todayIso: string,
): string {
  const days = calendarDaysBetween(todayIso, targetIso);
  if (days === 0) {
    return "today";
  }
  if (days === 1) {
    return "tomorrow";
  }
  if (days > 1) {
    return `in ${days} days`;
  }
  const ago = Math.abs(days);
  return ago === 1 ? "1 day ago" : `${ago} days ago`;
}

/**
 * Normalize a `?month=` query value to YYYY-MM-01, or null when invalid.
 * Accepts `YYYY-MM` or `YYYY-MM-DD` (day must be a real calendar date).
 */
export function resolveMonthStartParam(
  raw: string | undefined | null,
): string | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (isValidIsoMonth(trimmed)) {
    return `${trimmed}-01`;
  }
  if (isValidIsoDate(trimmed)) {
    return `${trimmed.slice(0, 7)}-01`;
  }
  return null;
}
