import { formatIsoDateLocal, parseIsoDateLocal } from "@/lib/domain/dates";

/** Visible day-timeline window shared by Calendar + Dashboard. */
export const CALENDAR_DAY_START_HOUR = 7;
export const CALENDAR_DAY_END_HOUR = 21;

/**
 * Household calendar event for a single day view.
 * Times are local clock hours (0–23). Full calendar CRUD arrives in a later
 * milestone — the Dashboard/Calendar day view is ready to render these.
 */
export type CalendarDayEvent = {
  id: string;
  title: string;
  /** Inclusive start hour on the day grid. */
  startHour: number;
  /** Exclusive end hour (minimum startHour + 1). */
  endHour: number;
  allDay: boolean;
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

export function buildCalendarDayViewModel(args: {
  dateIso: string;
  events?: CalendarDayEvent[];
}): CalendarDayViewModel {
  const date = parseIsoDateLocal(args.dateIso);
  return {
    dateIso: formatIsoDateLocal(date),
    dateLabel: formatCalendarDateLabel(args.dateIso),
    weekdayShort: date.toLocaleDateString("en-US", { weekday: "short" }),
    dayOfMonth: date.getDate(),
    monthLabel: date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    events: args.events ?? [],
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

/**
 * Temporary demo events so the day agenda can be reviewed before Calendar
 * CRUD ships. Replace with repository reads when events are persisted.
 */
export function placeholderCalendarDayEvents(): CalendarDayEvent[] {
  return [
    {
      id: "placeholder-all-day-1",
      title: "Trash day",
      startHour: 0,
      endHour: 1,
      allDay: true,
    },
    {
      id: "placeholder-timed-1",
      title: "Dentist",
      startHour: 10,
      endHour: 11,
      allDay: false,
    },
    {
      id: "placeholder-timed-2",
      title: "Grocery run",
      startHour: 14,
      endHour: 15,
      allDay: false,
    },
    {
      id: "placeholder-timed-3",
      title: "Walk",
      startHour: 18,
      endHour: 19,
      allDay: false,
    },
  ];
}
