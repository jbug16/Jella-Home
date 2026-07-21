import type { CalendarOccurrence } from "@/lib/domain/calendar-event";
import { expandCalendarEventInRange } from "@/lib/domain/calendar-event";
import type { CalendarEvent } from "@/lib/domain/calendar-event";

export function expandHouseholdEventsInRange(
  events: CalendarEvent[],
  rangeStart: string,
  rangeEnd: string,
): CalendarOccurrence[] {
  return events.flatMap((event) =>
    expandCalendarEventInRange(event, rangeStart, rangeEnd),
  );
}
