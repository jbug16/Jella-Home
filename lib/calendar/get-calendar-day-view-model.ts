import "server-only";

import { composeCalendarOccurrences } from "@/lib/calendar/sources";
import {
  buildCalendarDayViewModel,
  type CalendarDayViewModel,
} from "@/lib/domain/calendar";
import {
  sortCalendarOccurrences,
  type CalendarSourcePreferences,
} from "@/lib/domain/calendar-event";
import { todayIsoDate } from "@/lib/domain/dates";
import { listCalendarEventsOverlappingRange } from "@/lib/repositories/calendar-events";
import { listMyCalendarSourcePreferences } from "@/lib/repositories/calendar-source-preferences";
import { listSubscriptions } from "@/lib/repositories/subscriptions";

/**
 * Shared day composer for Calendar selected-day details and Dashboard Today.
 * Pass `now` only from tests — production uses the real local clock.
 */
export async function getCalendarDayViewModel(args?: {
  dateIso?: string;
  now?: Date;
  preferences?: CalendarSourcePreferences;
}): Promise<CalendarDayViewModel> {
  const dateIso = args?.dateIso ?? todayIsoDate(args?.now);

  const [events, preferences, subscriptions] = await Promise.all([
    listCalendarEventsOverlappingRange({
      rangeStart: dateIso,
      rangeEnd: dateIso,
    }),
    args?.preferences
      ? Promise.resolve(args.preferences)
      : listMyCalendarSourcePreferences(),
    listSubscriptions(),
  ]);

  const occurrences = sortCalendarOccurrences(
    composeCalendarOccurrences({
      events,
      subscriptions,
      preferences,
      rangeStart: dateIso,
      rangeEnd: dateIso,
    }),
  );

  return buildCalendarDayViewModel({ dateIso, occurrences });
}
