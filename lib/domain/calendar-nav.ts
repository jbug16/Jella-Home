import {
  addDays,
  formatIsoDateLocal,
  parseIsoDateLocal,
} from "@/lib/domain/dates";

/** Shift a selected day by whole weeks (preserves weekday). */
export function shiftSelectedDayByWeeks(
  day: string,
  deltaWeeks: number,
): string {
  return addDays(day, deltaWeeks * 7);
}

/**
 * Shift a selected day by months, clamping to the last valid day when the
 * source day-of-month does not exist in the target month (e.g. Jan 31 → Feb).
 */
export function shiftSelectedDayByMonths(
  day: string,
  deltaMonths: number,
): string {
  const date = parseIsoDateLocal(day);
  const dayOfMonth = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + deltaMonths, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(dayOfMonth, lastDay));
  return formatIsoDateLocal(target);
}

/** Keep the selected day inside the visible week, preserving weekday when possible. */
export function clampDayToWeek(day: string, weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const end = new Date(y!, m! - 1, d! + 6);
  const weekEnd = formatIsoDateLocal(end);
  if (day >= weekStart && day <= weekEnd) {
    return day;
  }
  return addDays(weekStart, parseIsoDateLocal(day).getDay());
}

/** Keep the selected day inside the visible month, preserving day-of-month when possible. */
export function clampDayToMonth(day: string, monthStart: string): string {
  const prefix = monthStart.slice(0, 7);
  if (day.startsWith(prefix)) {
    return day;
  }
  const dayOfMonth = parseIsoDateLocal(day).getDate();
  const year = Number(prefix.slice(0, 4));
  const month = Number(prefix.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  const clamped = Math.min(dayOfMonth, lastDay);
  return `${prefix}-${String(clamped).padStart(2, "0")}`;
}
