import { z } from "zod";

import { expectedUpdatedAtSchema } from "@/lib/domain/concurrency";
import {
  calendarDaysBetween,
  formatIsoDateUs,
  formatRelativeDayPhrase,
  isoDateSchema,
} from "@/lib/domain/dates";
import { toVersionTimestamp } from "@/lib/domain/timestamps";

export const DASHBOARD_COUNTDOWN_LIMIT = 4;

export const countdownColorSchema = z.enum([
  "teal",
  "rose",
  "amber",
  "violet",
  "sky",
  "emerald",
]);

export type CountdownColor = z.infer<typeof countdownColorSchema>;

export const COUNTDOWN_COLOR_OPTIONS = countdownColorSchema.options;

export const COUNTDOWN_COLOR_LABELS: Record<CountdownColor, string> = {
  teal: "Teal",
  rose: "Rose",
  amber: "Amber",
  violet: "Violet",
  sky: "Sky",
  emerald: "Emerald",
};

/** Dashboard tile styling keyed by user-selected color. */
export const COUNTDOWN_COLOR_STYLES: Record<
  CountdownColor,
  { tile: string; number: string; unit: string; swatch: string }
> = {
  teal: {
    swatch: "bg-teal-500",
    tile: "border-teal-200/80 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50 dark:border-teal-900/50 dark:from-teal-950/50 dark:via-cyan-950/30 dark:to-sky-950/20",
    number: "text-teal-700 dark:text-teal-300",
    unit: "text-teal-700/70 dark:text-teal-300/70",
  },
  rose: {
    swatch: "bg-rose-500",
    tile: "border-rose-200/80 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 dark:border-rose-900/50 dark:from-rose-950/50 dark:via-pink-950/30 dark:to-orange-950/20",
    number: "text-rose-700 dark:text-rose-300",
    unit: "text-rose-700/70 dark:text-rose-300/70",
  },
  amber: {
    swatch: "bg-amber-500",
    tile: "border-amber-200/80 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:border-amber-900/50 dark:from-amber-950/50 dark:via-yellow-950/30 dark:to-orange-950/20",
    number: "text-amber-800 dark:text-amber-300",
    unit: "text-amber-800/70 dark:text-amber-300/70",
  },
  violet: {
    swatch: "bg-violet-500",
    tile: "border-violet-200/80 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:border-violet-900/50 dark:from-violet-950/50 dark:via-purple-950/30 dark:to-fuchsia-950/20",
    number: "text-violet-700 dark:text-violet-300",
    unit: "text-violet-700/70 dark:text-violet-300/70",
  },
  sky: {
    swatch: "bg-sky-500",
    tile: "border-sky-200/80 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:border-sky-900/50 dark:from-sky-950/50 dark:via-blue-950/30 dark:to-indigo-950/20",
    number: "text-sky-700 dark:text-sky-300",
    unit: "text-sky-700/70 dark:text-sky-300/70",
  },
  emerald: {
    swatch: "bg-emerald-500",
    tile: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:border-emerald-900/50 dark:from-emerald-950/50 dark:via-green-950/30 dark:to-lime-950/20",
    number: "text-emerald-700 dark:text-emerald-300",
    unit: "text-emerald-700/70 dark:text-emerald-300/70",
  },
};

export const countdownSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  title: z.string(),
  targetOn: isoDateSchema,
  color: countdownColorSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Countdown = z.infer<typeof countdownSchema>;

export type CountdownRow = {
  id: string;
  household_id: string;
  title: string;
  target_on: string;
  color: string;
  created_at: string;
  updated_at: string;
};

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(120, "Title is too long.");

export const createCountdownInputSchema = z.object({
  title: titleSchema,
  targetOn: isoDateSchema,
  color: countdownColorSchema.default("teal"),
});

export type CreateCountdownInput = z.infer<typeof createCountdownInputSchema>;

export const updateCountdownInputSchema = createCountdownInputSchema.extend({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type UpdateCountdownInput = z.infer<typeof updateCountdownInputSchema>;

export const deleteCountdownInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type DeleteCountdownInput = z.infer<typeof deleteCountdownInputSchema>;

export function mapCountdown(row: CountdownRow): Countdown {
  return countdownSchema.parse({
    id: row.id,
    householdId: row.household_id,
    title: row.title.trim(),
    targetOn: row.target_on,
    color: row.color,
    createdAt: toVersionTimestamp(row.created_at),
    updatedAt: toVersionTimestamp(row.updated_at),
  });
}

export type CountdownListItem = {
  id: string;
  title: string;
  targetOn: string;
  color: CountdownColor;
  updatedAt: string;
  daysRemaining: number;
  headline: string;
  unitLabel: string;
  relativePhrase: string;
  dateLabel: string;
};

export type CountdownsCardViewModel = {
  todayIso: string;
  items: CountdownListItem[];
};

/** Large dashboard headline for days remaining. */
export function formatCountdownHeadline(daysRemaining: number): string {
  return String(Math.max(0, daysRemaining));
}

/** Sub-label under the headline. */
export function formatCountdownUnitLabel(daysRemaining: number): string {
  return Math.max(0, daysRemaining) === 1 ? "day" : "days";
}

export function toCountdownListItem(
  countdown: Countdown,
  todayIso: string,
): CountdownListItem {
  const daysRemaining = calendarDaysBetween(todayIso, countdown.targetOn);
  return {
    id: countdown.id,
    title: countdown.title,
    targetOn: countdown.targetOn,
    color: countdown.color,
    updatedAt: countdown.updatedAt,
    daysRemaining,
    headline: formatCountdownHeadline(daysRemaining),
    unitLabel: formatCountdownUnitLabel(daysRemaining),
    relativePhrase: formatRelativeDayPhrase(countdown.targetOn, todayIso),
    dateLabel: formatIsoDateUs(countdown.targetOn),
  };
}

export function buildCountdownsCardViewModel(args: {
  todayIso: string;
  countdowns: Countdown[];
  limit?: number;
}): CountdownsCardViewModel {
  const limit = args.limit ?? DASHBOARD_COUNTDOWN_LIMIT;
  const items = args.countdowns
    .filter((countdown) => countdown.targetOn >= args.todayIso)
    .slice()
    .sort((a, b) => {
      if (a.targetOn !== b.targetOn) {
        return a.targetOn < b.targetOn ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit)
    .map((countdown) => toCountdownListItem(countdown, args.todayIso));

  return {
    todayIso: args.todayIso,
    items,
  };
}
