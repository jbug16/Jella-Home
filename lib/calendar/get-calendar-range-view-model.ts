import "server-only";

import { composeCalendarOccurrences } from "@/lib/calendar/sources";
import {
  filterOccurrencesForDay,
  monthGridRange,
  sortCalendarOccurrences,
  type CalendarEvent,
  type CalendarOccurrence,
  type CalendarSourcePreferences,
} from "@/lib/domain/calendar-event";
import { weekEndOn, weekStartOn } from "@/lib/domain/meal-plan";
import { monthStartFor } from "@/lib/domain/budget";
import { listCalendarEventsOverlappingRange } from "@/lib/repositories/calendar-events";
import { listMyCalendarSourcePreferences } from "@/lib/repositories/calendar-source-preferences";
import { listSubscriptions } from "@/lib/repositories/subscriptions";

export type CalendarViewMode = "week" | "month";

export type CalendarRangeViewModel = {
  view: CalendarViewMode;
  rangeStart: string;
  rangeEnd: string;
  weekStart: string;
  monthStart: string;
  selectedDay: string;
  preferences: CalendarSourcePreferences;
  events: CalendarEvent[];
  occurrences: CalendarOccurrence[];
  selectedDayOccurrences: CalendarOccurrence[];
};

export async function getCalendarRangeViewModel(args: {
  view: CalendarViewMode;
  weekStart: string;
  monthStart: string;
  selectedDay: string;
}): Promise<CalendarRangeViewModel> {
  const weekStart = weekStartOn(args.weekStart);
  const monthStart = monthStartFor(args.monthStart);
  const { rangeStart, rangeEnd } =
    args.view === "week"
      ? { rangeStart: weekStart, rangeEnd: weekEndOn(weekStart) }
      : monthGridRange(monthStart);

  // Month grid shows leading/trailing days from adjacent months — expand
  // to the full Sunday–Saturday grid that contains the month.
  let fetchStart = rangeStart;
  let fetchEnd = rangeEnd;
  if (args.view === "month") {
    fetchStart = weekStartOn(rangeStart);
    fetchEnd = weekEndOn(weekStartOn(rangeEnd));
  }

  const [events, preferences, subscriptions] = await Promise.all([
    listCalendarEventsOverlappingRange({
      rangeStart: fetchStart,
      rangeEnd: fetchEnd,
    }),
    listMyCalendarSourcePreferences(),
    listSubscriptions(),
  ]);

  const occurrences = sortCalendarOccurrences(
    composeCalendarOccurrences({
      events,
      subscriptions,
      preferences,
      rangeStart: fetchStart,
      rangeEnd: fetchEnd,
    }),
  );

  return {
    view: args.view,
    rangeStart: fetchStart,
    rangeEnd: fetchEnd,
    weekStart,
    monthStart,
    selectedDay: args.selectedDay,
    preferences,
    events,
    occurrences,
    selectedDayOccurrences: filterOccurrencesForDay(
      occurrences,
      args.selectedDay,
    ),
  };
}
