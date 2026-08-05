import { z } from "zod";

import { expectedUpdatedAtSchema } from "@/lib/domain/concurrency";
import {
  addDays,
  formatIsoDateLocal,
  isoDateSchema,
  parseIsoDateLocal,
} from "@/lib/domain/dates";
import { addMonthsWithBillingDay } from "@/lib/domain/subscription";
import { toVersionTimestamp } from "@/lib/domain/timestamps";

/** Fixed calendars (categories) for V1 — color-coded in the UI. */
export const calendarEventCategorySchema = z.enum([
  "appointment",
  "school",
  "fun",
  "date",
  "birthday",
  "holiday",
  "household",
  "reminder",
  "trip",
  "other",
]);

export type CalendarEventCategory = z.infer<typeof calendarEventCategorySchema>;

export const CALENDAR_EVENT_CATEGORY_LABELS: Record<
  CalendarEventCategory,
  string
> = {
  appointment: "Appointments",
  school: "School",
  fun: "Fun",
  date: "Date night",
  birthday: "Birthdays",
  holiday: "Holidays",
  household: "Household",
  reminder: "Reminders",
  trip: "Trips",
  other: "Other",
};

/**
 * Tailwind classes for calendar color coding.
 * `dot` — filter accent; `chip` — event card left-border accent (card fill matches meals).
 */
export const CALENDAR_EVENT_CATEGORY_COLORS: Record<
  CalendarEventCategory,
  { dot: string; chip: string }
> = {
  appointment: {
    dot: "bg-sky-500",
    chip: "border-l-sky-500",
  },
  school: {
    dot: "bg-amber-500",
    chip: "border-l-amber-500",
  },
  fun: {
    dot: "bg-teal-500",
    chip: "border-l-teal-500",
  },
  date: {
    dot: "bg-rose-500",
    chip: "border-l-rose-500",
  },
  birthday: {
    dot: "bg-orange-500",
    chip: "border-l-orange-500",
  },
  holiday: {
    dot: "bg-emerald-500",
    chip: "border-l-emerald-500",
  },
  household: {
    dot: "bg-slate-500",
    chip: "border-l-slate-500",
  },
  reminder: {
    dot: "bg-yellow-500",
    chip: "border-l-yellow-500",
  },
  trip: {
    dot: "bg-cyan-600",
    chip: "border-l-cyan-600",
  },
  other: {
    dot: "bg-stone-400",
    chip: "border-l-stone-400",
  },
};

/** Toggle order in the calendar filter strip. */
export const CALENDAR_FILTER_CATEGORIES = calendarEventCategorySchema.options;

export const calendarRecurrenceSchema = z.enum([
  "none",
  "daily",
  "weekly",
  "every_two_weeks",
  "monthly",
  "yearly",
]);

export type CalendarRecurrence = z.infer<typeof calendarRecurrenceSchema>;

export const CALENDAR_RECURRENCE_LABELS: Record<CalendarRecurrence, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  every_two_weeks: "Every two weeks",
  monthly: "Monthly",
  yearly: "Yearly",
};

/** Local wall-clock time HH:MM or HH:MM:SS. */
export const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use a valid time (HH:MM).");

export function normalizeLocalTime(time: string): string {
  const parsed = localTimeSchema.parse(time);
  return parsed.length === 5 ? `${parsed}:00` : parsed;
}

export function formatLocalTimeDisplay(time: string): string {
  const normalized = normalizeLocalTime(time);
  const [hourText, minuteText] = normalized.split(":");
  const hour = Number(hourText);
  const minute = minuteText;
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${minute} ${suffix}`;
}

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title is too long.");

const notesSchema = z.string().trim().max(2000, "Notes are too long.");
const locationSchema = z.string().trim().max(200, "Location is too long.");

export const calendarEventSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  title: z.string().min(1),
  notes: z.string(),
  location: z.string(),
  category: calendarEventCategorySchema,
  allDay: z.boolean(),
  startOn: isoDateSchema,
  endOn: isoDateSchema,
  startAt: localTimeSchema.nullable(),
  endAt: localTimeSchema.nullable(),
  recurrence: calendarRecurrenceSchema,
  recurrenceEndOn: isoDateSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export type CalendarEventRow = {
  id: string;
  household_id: string;
  title: string;
  notes: string;
  location: string;
  category: string;
  all_day: boolean;
  start_on: string;
  end_on: string;
  start_at: string | null;
  end_at: string | null;
  recurrence: string;
  recurrence_end_on: string | null;
  created_at: string;
  updated_at: string;
};

export function mapCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return calendarEventSchema.parse({
    id: row.id,
    householdId: row.household_id,
    title: row.title,
    notes: row.notes,
    location: row.location,
    category: row.category,
    allDay: row.all_day,
    startOn: row.start_on,
    endOn: row.end_on,
    startAt: row.start_at,
    endAt: row.end_at,
    recurrence: row.recurrence,
    recurrenceEndOn: row.recurrence_end_on,
    createdAt: row.created_at,
    updatedAt: toVersionTimestamp(row.updated_at),
  });
}

/** Day-of-month (1–31) from a YYYY-MM-DD date for monthly/yearly anchors. */
export function occurrenceDayFromIso(isoDate: string): number {
  return parseIsoDateLocal(isoDate).getDate();
}

function refineTimedAllDay(
  input: {
    allDay: boolean;
    startOn: string;
    endOn: string;
    startAt?: string | null;
    endAt?: string | null;
    recurrence: CalendarRecurrence;
    recurrenceEndOn?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  if (input.endOn < input.startOn) {
    ctx.addIssue({
      code: "custom",
      message: "End date must be on or after the start date.",
      path: ["endOn"],
    });
  }

  if (input.allDay) {
    if (input.startAt || input.endAt) {
      ctx.addIssue({
        code: "custom",
        message: "All-day events cannot have times.",
        path: ["startAt"],
      });
    }
  } else {
    if (!input.startAt || !input.endAt) {
      ctx.addIssue({
        code: "custom",
        message: "Timed events need a start and end time.",
        path: ["startAt"],
      });
    } else if (input.endOn === input.startOn) {
      const startAt = normalizeLocalTime(input.startAt);
      const endAt = normalizeLocalTime(input.endAt);
      if (endAt <= startAt) {
        ctx.addIssue({
          code: "custom",
          message: "End time must be after start time on the same day.",
          path: ["endAt"],
        });
      }
    }
  }

  if (input.recurrence === "none" && input.recurrenceEndOn) {
    ctx.addIssue({
      code: "custom",
      message: "A non-repeating event cannot have a recurrence end date.",
      path: ["recurrenceEndOn"],
    });
  }

  if (input.recurrenceEndOn && input.recurrenceEndOn < input.startOn) {
    ctx.addIssue({
      code: "custom",
      message: "Recurrence end must be on or after the start date.",
      path: ["recurrenceEndOn"],
    });
  }
}

const calendarEventWriteFieldsSchema = z
  .object({
    title: titleSchema,
    notes: notesSchema.default(""),
    location: locationSchema.default(""),
    category: calendarEventCategorySchema.default("other"),
    allDay: z.boolean(),
    startOn: isoDateSchema,
    endOn: isoDateSchema,
    startAt: localTimeSchema.nullable().optional(),
    endAt: localTimeSchema.nullable().optional(),
    recurrence: calendarRecurrenceSchema.default("none"),
    recurrenceEndOn: isoDateSchema.nullable().optional(),
  })
  .superRefine(refineTimedAllDay)
  .transform((input) => {
    const allDay = input.allDay;
    return {
      title: input.title,
      notes: input.notes,
      location: input.location,
      category: input.category,
      allDay,
      startOn: input.startOn,
      endOn: input.endOn,
      startAt: allDay ? null : normalizeLocalTime(input.startAt as string),
      endAt: allDay ? null : normalizeLocalTime(input.endAt as string),
      recurrence: input.recurrence,
      recurrenceEndOn:
        input.recurrence === "none" ? null : (input.recurrenceEndOn ?? null),
    };
  });

export const createCalendarEventInputSchema = calendarEventWriteFieldsSchema;
export type CreateCalendarEventInput = z.infer<
  typeof createCalendarEventInputSchema
>;

export const updateCalendarEventInputSchema = z
  .object({
    id: z.uuid(),
    expectedUpdatedAt: expectedUpdatedAtSchema,
    title: titleSchema,
    notes: notesSchema.default(""),
    location: locationSchema.default(""),
    category: calendarEventCategorySchema.default("other"),
    allDay: z.boolean(),
    startOn: isoDateSchema,
    endOn: isoDateSchema,
    startAt: localTimeSchema.nullable().optional(),
    endAt: localTimeSchema.nullable().optional(),
    recurrence: calendarRecurrenceSchema.default("none"),
    recurrenceEndOn: isoDateSchema.nullable().optional(),
  })
  .superRefine(refineTimedAllDay)
  .transform((input) => {
    const allDay = input.allDay;
    return {
      id: input.id,
      expectedUpdatedAt: input.expectedUpdatedAt,
      title: input.title,
      notes: input.notes,
      location: input.location,
      category: input.category,
      allDay,
      startOn: input.startOn,
      endOn: input.endOn,
      startAt: allDay ? null : normalizeLocalTime(input.startAt as string),
      endAt: allDay ? null : normalizeLocalTime(input.endAt as string),
      recurrence: input.recurrence,
      recurrenceEndOn:
        input.recurrence === "none" ? null : (input.recurrenceEndOn ?? null),
    };
  });

export type UpdateCalendarEventInput = z.infer<
  typeof updateCalendarEventInputSchema
>;

export const deleteCalendarEventInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type DeleteCalendarEventInput = z.infer<
  typeof deleteCalendarEventInputSchema
>;

export const calendarSourceKeySchema = z.enum([
  "household_events",
  "subscription_renewals",
  "payment_reminders",
]);

export type CalendarSourceKey = z.infer<typeof calendarSourceKeySchema>;

/** Source keys shown as toggles in V1 UI. */
export const CALENDAR_V1_VISIBLE_SOURCE_KEYS = [
  "household_events",
  "subscription_renewals",
] as const satisfies readonly CalendarSourceKey[];

export const CALENDAR_SOURCE_LABELS: Record<CalendarSourceKey, string> = {
  household_events: "Household events",
  subscription_renewals: "Subscription renewals",
  payment_reminders: "Payment reminders",
};

export type CalendarSourcePreferences = Record<CalendarSourceKey, boolean>;

export function defaultCalendarSourcePreferences(): CalendarSourcePreferences {
  return {
    household_events: true,
    subscription_renewals: true,
    payment_reminders: true,
  };
}

export function mergeCalendarSourcePreferences(
  rows: { sourceKey: CalendarSourceKey; visible: boolean }[],
): CalendarSourcePreferences {
  const prefs = defaultCalendarSourcePreferences();
  for (const row of rows) {
    prefs[row.sourceKey] = row.visible;
  }
  return prefs;
}

/** Inclusive day span length in days (0 = single day). */
export function eventDurationDays(startOn: string, endOn: string): number {
  const start = parseIsoDateLocal(startOn);
  const end = parseIsoDateLocal(endOn);
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function nextRecurrenceStart(
  previousStartOn: string,
  recurrence: Exclude<CalendarRecurrence, "none">,
  occurrenceDay: number,
): string {
  switch (recurrence) {
    case "daily":
      return addDays(previousStartOn, 1);
    case "weekly":
      return addDays(previousStartOn, 7);
    case "every_two_weeks":
      return addDays(previousStartOn, 14);
    case "monthly":
      return addMonthsWithBillingDay(previousStartOn, 1, occurrenceDay);
    case "yearly":
      return addMonthsWithBillingDay(previousStartOn, 12, occurrenceDay);
  }
}

/** Max inclusive days for a single expansion query. */
export const CALENDAR_EXPANSION_MAX_DAYS = 400;

export function assertRangeWithinExpansionLimit(
  rangeStart: string,
  rangeEnd: string,
): void {
  if (rangeEnd < rangeStart) {
    throw new Error("Calendar range end must be on or after range start.");
  }
  const days = eventDurationDays(rangeStart, rangeEnd);
  if (days > CALENDAR_EXPANSION_MAX_DAYS) {
    throw new Error("Calendar range is too large.");
  }
}

export type CalendarOccurrence = {
  id: string;
  sourceKey: CalendarSourceKey;
  seriesId: string | null;
  title: string;
  notes: string;
  location: string;
  category: CalendarEventCategory | null;
  allDay: boolean;
  startOn: string;
  endOn: string;
  startAt: string | null;
  endAt: string | null;
  recurrence: CalendarRecurrence | null;
  href: string | null;
  readonly: boolean;
};

export function occurrenceIntersectsRange(
  occStartOn: string,
  occEndOn: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  return occStartOn <= rangeEnd && occEndOn >= rangeStart;
}

/**
 * Fast-forward a recurring series to the first occurrence start that could
 * intersect [rangeStart, rangeEnd] (accounts for multi-day duration spill).
 */
export function seekRecurrenceStartNearRange(
  seriesStartOn: string,
  recurrence: Exclude<CalendarRecurrence, "none">,
  occurrenceDay: number,
  rangeStart: string,
  durationDays: number,
  recurrenceEndOn: string | null,
): string | null {
  const earliestNeeded = addDays(rangeStart, -durationDays);
  let occStart = seriesStartOn;
  let guard = 0;
  const maxSeek = 5000;

  while (occStart < earliestNeeded && guard < maxSeek) {
    guard += 1;
    if (recurrenceEndOn && occStart > recurrenceEndOn) {
      return null;
    }
    const next = nextRecurrenceStart(occStart, recurrence, occurrenceDay);
    if (next <= occStart) {
      return null;
    }
    occStart = next;
  }

  if (recurrenceEndOn && occStart > recurrenceEndOn) {
    return null;
  }
  return occStart;
}

export function expandCalendarEventInRange(
  event: CalendarEvent,
  rangeStart: string,
  rangeEnd: string,
): CalendarOccurrence[] {
  assertRangeWithinExpansionLimit(rangeStart, rangeEnd);

  const duration = eventDurationDays(event.startOn, event.endOn);
  const occurrenceDay = occurrenceDayFromIso(event.startOn);
  const results: CalendarOccurrence[] = [];

  if (event.recurrence === "none") {
    if (
      occurrenceIntersectsRange(
        event.startOn,
        event.endOn,
        rangeStart,
        rangeEnd,
      )
    ) {
      results.push(toNativeOccurrence(event, event.startOn, event.endOn));
    }
    return results;
  }

  let occStart = seekRecurrenceStartNearRange(
    event.startOn,
    event.recurrence,
    occurrenceDay,
    rangeStart,
    duration,
    event.recurrenceEndOn,
  );
  if (!occStart) {
    return results;
  }

  let guard = 0;
  const maxIterations = CALENDAR_EXPANSION_MAX_DAYS + 50;

  while (occStart <= rangeEnd && guard < maxIterations) {
    guard += 1;

    if (event.recurrenceEndOn && occStart > event.recurrenceEndOn) {
      break;
    }

    const occEnd = addDays(occStart, duration);
    if (occurrenceIntersectsRange(occStart, occEnd, rangeStart, rangeEnd)) {
      results.push(toNativeOccurrence(event, occStart, occEnd));
    }

    const next = nextRecurrenceStart(occStart, event.recurrence, occurrenceDay);
    if (next <= occStart) {
      break;
    }
    occStart = next;
  }

  return results;
}

function toNativeOccurrence(
  event: CalendarEvent,
  startOn: string,
  endOn: string,
): CalendarOccurrence {
  return {
    id: `evt:${event.id}:${startOn}`,
    sourceKey: "household_events",
    seriesId: event.id,
    title: event.title,
    notes: event.notes,
    location: event.location,
    category: event.category,
    allDay: event.allDay,
    startOn,
    endOn,
    startAt: event.startAt,
    endAt: event.endAt,
    recurrence: event.recurrence,
    href: null,
    readonly: false,
  };
}

/** Whether a series row could produce occurrences intersecting the range. */
export function calendarEventCouldOverlapRange(
  event: Pick<
    CalendarEvent,
    "startOn" | "endOn" | "recurrence" | "recurrenceEndOn"
  >,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  if (event.recurrence === "none") {
    return occurrenceIntersectsRange(
      event.startOn,
      event.endOn,
      rangeStart,
      rangeEnd,
    );
  }
  if (event.startOn > rangeEnd) {
    return false;
  }
  if (event.recurrenceEndOn && event.recurrenceEndOn < rangeStart) {
    return false;
  }
  return true;
}

export function sortCalendarOccurrences(
  occurrences: CalendarOccurrence[],
): CalendarOccurrence[] {
  return occurrences.slice().sort((a, b) => {
    if (a.startOn !== b.startOn) {
      return a.startOn.localeCompare(b.startOn);
    }
    if (a.allDay !== b.allDay) {
      return a.allDay ? -1 : 1;
    }
    const aTime = a.startAt ?? "";
    const bTime = b.startAt ?? "";
    if (aTime !== bTime) {
      return aTime.localeCompare(bTime);
    }
    return a.title.localeCompare(b.title);
  });
}

export function filterOccurrencesForDay(
  occurrences: CalendarOccurrence[],
  dayIso: string,
): CalendarOccurrence[] {
  return sortCalendarOccurrences(
    occurrences.filter((occ) =>
      occurrenceIntersectsRange(occ.startOn, occ.endOn, dayIso, dayIso),
    ),
  );
}

/** Group week occurrences by day (all-day first, then start time). */
export function groupOccurrencesByDate(
  occurrences: CalendarOccurrence[],
  weekDays: string[],
): Map<string, CalendarOccurrence[]> {
  const map = new Map<string, CalendarOccurrence[]>(
    weekDays.map((day) => [day, []]),
  );
  for (const day of weekDays) {
    map.set(day, filterOccurrencesForDay(occurrences, day));
  }
  return map;
}

/** Format time line under an event title (all-day or start–end). */
export function formatOccurrenceTimeLabel(occ: {
  allDay: boolean;
  startAt: string | null;
  endAt: string | null;
}): string {
  if (occ.allDay) {
    return "All day";
  }
  if (!occ.startAt) {
    return "";
  }
  const start = formatLocalTimeDisplay(occ.startAt);
  if (!occ.endAt) {
    return start;
  }
  return `${start} – ${formatLocalTimeDisplay(occ.endAt)}`;
}

export function monthGridRange(monthStart: string): {
  rangeStart: string;
  rangeEnd: string;
} {
  const start = parseIsoDateLocal(monthStart);
  if (start.getDate() !== 1) {
    throw new Error("monthStart must be the first of the month.");
  }
  const year = start.getFullYear();
  const month = start.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  return {
    rangeStart: formatIsoDateLocal(start),
    rangeEnd: formatIsoDateLocal(lastDay),
  };
}
