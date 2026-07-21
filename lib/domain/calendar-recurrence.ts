/**
 * Pure recurrence helpers for household calendar events.
 * Expansion lives here so Vitest can cover clamps without repository I/O.
 */
export {
  assertRangeWithinExpansionLimit,
  CALENDAR_EXPANSION_MAX_DAYS,
  calendarEventCouldOverlapRange,
  expandCalendarEventInRange,
  nextRecurrenceStart,
  occurrenceDayFromIso,
  occurrenceIntersectsRange,
  seekRecurrenceStartNearRange,
} from "@/lib/domain/calendar-event";
