import {
  filterOccurrencesForDay,
  type CalendarOccurrence,
} from "@/lib/domain/calendar-event";
import { formatIsoDateLocal, parseIsoDateLocal } from "@/lib/domain/dates";

/** Visible day-timeline window shared by Calendar + Dashboard. */
export const CALENDAR_DAY_START_HOUR = 7;
export const CALENDAR_DAY_END_HOUR = 21;

/**
 * Household calendar event for a single day view (Dashboard agenda).
 * Times are local clock hours (0–23).
 */
export type CalendarDayEvent = {
  id: string;
  title: string;
  /** Inclusive start hour on the day grid. */
  startHour: number;
  /** Exclusive end hour (minimum startHour + 1). */
  endHour: number;
  allDay: boolean;
  sourceKey?: string;
  href?: string | null;
  readonly?: boolean;
  category?: string | null;
};

export type CalendarDayViewModel = {
  dateIso: string;
  dateLabel: string;
  weekdayShort: string;
  dayOfMonth: number;
  monthLabel: string;
  events: CalendarDayEvent[];
};

export function formatCalendarDateLabel(isoDate: string): string {
  const date = parseIsoDateLocal(isoDate);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function hourFromLocalTime(time: string | null | undefined): number {
  if (!time) {
    return 0;
  }
  const [hourText] = time.split(":");
  return Number(hourText);
}

/** Map a composed occurrence intersecting `dateIso` into a day-agenda event. */
export function occurrenceToDayEvent(
  occ: CalendarOccurrence,
  dateIso: string,
): CalendarDayEvent {
  if (occ.allDay) {
    return {
      id: occ.id,
      title: occ.title,
      startHour: 0,
      endHour: 1,
      allDay: true,
      sourceKey: occ.sourceKey,
      href: occ.href,
      readonly: occ.readonly,
      category: occ.category,
    };
  }

  const startsToday = occ.startOn === dateIso;
  const endsToday = occ.endOn === dateIso;
  const startHour = startsToday ? hourFromLocalTime(occ.startAt) : 0;
  let endHour = endsToday ? hourFromLocalTime(occ.endAt) : 24;
  if (endHour <= startHour) {
    endHour = startHour + 1;
  }

  return {
    id: occ.id,
    title: occ.title,
    startHour,
    endHour,
    allDay: false,
    sourceKey: occ.sourceKey,
    href: occ.href,
    readonly: occ.readonly,
    category: occ.category,
  };
}

export function buildCalendarDayViewModel(args: {
  dateIso: string;
  events?: CalendarDayEvent[];
  occurrences?: CalendarOccurrence[];
}): CalendarDayViewModel {
  const date = parseIsoDateLocal(args.dateIso);
  const dateIso = formatIsoDateLocal(date);

  let events = args.events ?? [];
  if (args.occurrences) {
    const forDay = filterOccurrencesForDay(args.occurrences, dateIso);
    events = forDay.map((occ) => occurrenceToDayEvent(occ, dateIso));
  }

  return {
    dateIso,
    dateLabel: formatCalendarDateLabel(dateIso),
    weekdayShort: date.toLocaleDateString("en-US", { weekday: "short" }),
    dayOfMonth: date.getDate(),
    monthLabel: date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    events,
  };
}

export function calendarDayHours(
  startHour = CALENDAR_DAY_START_HOUR,
  endHour = CALENDAR_DAY_END_HOUR,
): number[] {
  const hours: number[] = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    hours.push(hour);
  }
  return hours;
}

export function formatCalendarHourLabel(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}
