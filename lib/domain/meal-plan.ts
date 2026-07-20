import { z } from "zod";

import {
  addDays,
  formatIsoDateLocal,
  isoDateSchema,
  isValidIsoDate,
  parseIsoDateLocal,
  todayIsoDate,
} from "@/lib/domain/dates";
import { servingsSchema } from "@/lib/domain/recipe";

/** UI + write slots. DB may also contain `other` (hidden in the app). */
export const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export type MealSlot = z.infer<typeof mealSlotSchema>;

/** Slots accepted when reading from the database. */
export const mealSlotDbSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
]);

export type MealSlotDb = z.infer<typeof mealSlotDbSchema>;

export const MEAL_SLOTS: readonly MealSlot[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const SLOT_SORT_ORDER: Record<MealSlotDb, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
  other: 4,
};

const nonEmptyTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a meal name.")
  .max(200, "That name is too long.");

export const plannedMealSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  planDate: isoDateSchema,
  mealSlot: mealSlotDbSchema,
  recipeId: z.uuid().nullable(),
  /** Display title / recipe name snapshot (maps to custom_title). */
  title: nonEmptyTitleSchema,
  servings: servingsSchema.nullable(),
  notes: z.string(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  recipeName: z.string().nullable(),
  recipeArchived: z.boolean(),
});

export type PlannedMeal = z.infer<typeof plannedMealSchema>;

export const createPlannedMealInputSchema = z
  .object({
    planDate: isoDateSchema,
    mealSlot: mealSlotSchema,
    recipeId: z.uuid().nullable().optional(),
    title: z.string().trim().max(200).optional(),
    servings: servingsSchema.nullable().optional(),
    notes: z.string().trim().max(2_000).default(""),
  })
  .superRefine((value, ctx) => {
    const recipeId = value.recipeId ?? null;
    const title = value.title?.trim() ?? "";
    if (!recipeId && title.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a recipe or enter a meal name.",
        path: ["title"],
      });
    }
  });

export type CreatePlannedMealInput = z.infer<
  typeof createPlannedMealInputSchema
>;

/** Create the same meal on one or more days (no schema change — loops creates). */
export const createPlannedMealsInputSchema = z
  .object({
    planDates: z.array(isoDateSchema).min(1, "Choose at least one day."),
    mealSlot: mealSlotSchema,
    recipeId: z.uuid().nullable().optional(),
    title: z.string().trim().max(200).optional(),
    servings: servingsSchema.nullable().optional(),
    notes: z.string().trim().max(2_000).default(""),
  })
  .superRefine((value, ctx) => {
    const recipeId = value.recipeId ?? null;
    const title = value.title?.trim() ?? "";
    if (!recipeId && title.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a recipe or enter a meal name.",
        path: ["title"],
      });
    }
    const unique = new Set(value.planDates);
    if (unique.size !== value.planDates.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each day can only be selected once.",
        path: ["planDates"],
      });
    }
  });

export type CreatePlannedMealsInput = z.infer<
  typeof createPlannedMealsInputSchema
>;

export const updatePlannedMealInputSchema = z
  .object({
    id: z.uuid(),
    planDate: isoDateSchema,
    mealSlot: mealSlotSchema,
    recipeId: z.uuid().nullable().optional(),
    title: z.string().trim().max(200).optional(),
    servings: servingsSchema.nullable().optional(),
    notes: z.string().trim().max(2_000).default(""),
  })
  .superRefine((value, ctx) => {
    const recipeId = value.recipeId ?? null;
    const title = value.title?.trim() ?? "";
    if (!recipeId && title.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a recipe or enter a meal name.",
        path: ["title"],
      });
    }
  });

export type UpdatePlannedMealInput = z.infer<
  typeof updatePlannedMealInputSchema
>;

/**
 * Sunday of the week containing `isoDate` (Sun–Sat).
 * Accepts any date in the week and normalizes to that Sunday.
 */
export function weekStartOn(isoDate: string): string {
  const date = parseIsoDateLocal(isoDate);
  const day = date.getDay(); // 0=Sun … 6=Sat
  date.setDate(date.getDate() - day);
  return formatIsoDateLocal(date);
}

/** Saturday (= Sunday + 6) for a Sunday week start. */
export function weekEndOn(weekStart: string): string {
  const sunday = weekStartOn(weekStart);
  return addDays(sunday, 6);
}

export function shiftWeekStart(weekStart: string, deltaWeeks: number): string {
  return addDays(weekStartOn(weekStart), deltaWeeks * 7);
}

export function daysInWeek(weekStart: string): string[] {
  const sunday = weekStartOn(weekStart);
  return Array.from({ length: 7 }, (_, index) => addDays(sunday, index));
}

export function isDateInWeek(isoDate: string, weekStart: string): boolean {
  const start = weekStartOn(weekStart);
  const end = weekEndOn(start);
  const date = isoDateSchema.parse(isoDate);
  return date >= start && date <= end;
}

export function currentWeekStart(now = new Date()): string {
  return weekStartOn(todayIsoDate(now));
}

/**
 * Resolve a `?week=` query value: any date in a week → that week's Sunday.
 * Invalid or missing → current local week. Never throws for bad input.
 */
export function resolveWeekStartParam(
  raw: string | undefined | null,
  now = new Date(),
): string {
  if (!raw || typeof raw !== "string") {
    return currentWeekStart(now);
  }
  const trimmed = raw.trim();
  if (!isValidIsoDate(trimmed)) {
    return currentWeekStart(now);
  }
  try {
    return weekStartOn(trimmed);
  } catch {
    return currentWeekStart(now);
  }
}

/** Short label like "Jul 13 – 19, 2026". */
export function formatWeekLabel(weekStart: string): string {
  const start = weekStartOn(weekStart);
  const end = weekEndOn(start);
  const startDate = parseIsoDateLocal(start);
  const endDate = parseIsoDateLocal(end);
  const startMonth = startDate.toLocaleString("en-US", { month: "short" });
  const endMonth = endDate.toLocaleString("en-US", { month: "short" });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/** Weekday short label for a date (e.g. "Mon"). */
export function formatWeekdayShort(isoDate: string): string {
  return parseIsoDateLocal(isoDate).toLocaleString("en-US", {
    weekday: "short",
  });
}

/** Day-of-month number for a date. */
export function formatDayOfMonth(isoDate: string): string {
  return String(parseIsoDateLocal(isoDate).getDate());
}

export function mealSlotLabel(slot: MealSlotDb): string {
  if (slot === "other") {
    return "Other";
  }
  return MEAL_SLOT_LABELS[slot];
}

export function mealSlotSortKey(slot: MealSlotDb): number {
  return SLOT_SORT_ORDER[slot] ?? 99;
}

export function comparePlannedMeals(a: PlannedMeal, b: PlannedMeal): number {
  if (a.planDate !== b.planDate) {
    return a.planDate < b.planDate ? -1 : 1;
  }
  const slotDiff = mealSlotSortKey(a.mealSlot) - mealSlotSortKey(b.mealSlot);
  if (slotDiff !== 0) {
    return slotDiff;
  }
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortPlannedMeals(meals: PlannedMeal[]): PlannedMeal[] {
  return [...meals].sort(comparePlannedMeals);
}

export function groupMealsByDate(
  meals: PlannedMeal[],
  weekStart: string,
): Map<string, PlannedMeal[]> {
  const days = daysInWeek(weekStart);
  const map = new Map<string, PlannedMeal[]>(days.map((day) => [day, []]));
  for (const meal of sortPlannedMeals(meals)) {
    const list = map.get(meal.planDate);
    if (list) {
      list.push(meal);
    }
  }
  return map;
}

export type PlannedMealRow = {
  id: string;
  household_id: string;
  plan_date: string;
  meal_slot: string;
  recipe_id: string | null;
  custom_title: string;
  servings: number | null;
  notes: string;
  sort_order: number;
  created_at: string;
  recipe?: {
    id: string;
    name: string;
    archived_at: string | null;
  } | null;
};

export function mapPlannedMeal(row: PlannedMealRow): PlannedMeal {
  const recipe = row.recipe ?? null;
  return plannedMealSchema.parse({
    id: row.id,
    householdId: row.household_id,
    planDate: row.plan_date,
    mealSlot: row.meal_slot,
    recipeId: row.recipe_id,
    title: row.custom_title,
    servings: row.servings,
    notes: row.notes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    recipeName: recipe?.name ?? null,
    recipeArchived: Boolean(recipe?.archived_at),
  });
}

/** Optional servings from a form string; blank → null. */
export function parseOptionalServingsInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter servings as a positive number.");
  }
  const value = Number(trimmed);
  if (!(value > 0)) {
    throw new Error("Servings must be greater than zero.");
  }
  return value;
}
