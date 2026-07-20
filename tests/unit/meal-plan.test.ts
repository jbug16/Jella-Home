import { describe, expect, it } from "vitest";

import {
  addDays,
  formatIsoDateLocal,
  isoDateSchema,
  isValidIsoDate,
  parseIsoDateLocal,
  todayIsoDate,
} from "@/lib/domain/dates";
import {
  comparePlannedMeals,
  createPlannedMealInputSchema,
  createPlannedMealsInputSchema,
  currentWeekStart,
  daysInWeek,
  formatWeekLabel,
  mapPlannedMeal,
  resolveWeekStartParam,
  shiftWeekStart,
  weekEndOn,
  weekStartOn,
  type PlannedMeal,
} from "@/lib/domain/meal-plan";

describe("isoDateSchema / local dates", () => {
  it("accepts YYYY-MM-DD and rejects invalid calendar dates", () => {
    expect(isoDateSchema.parse("2026-07-13")).toBe("2026-07-13");
    expect(isoDateSchema.safeParse("07/13/2026").success).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
  });

  it("does not shift local calendar dates via UTC", () => {
    const local = parseIsoDateLocal("2026-07-13");
    expect(formatIsoDateLocal(local)).toBe("2026-07-13");
    expect(addDays("2026-07-13", 1)).toBe("2026-07-14");
  });
});

describe("weekStartOn (Sunday)", () => {
  it("normalizes any day in the week to Sunday", () => {
    // 2026-07-12 is Sunday; 2026-07-18 is Saturday of the same week.
    expect(weekStartOn("2026-07-12")).toBe("2026-07-12");
    expect(weekStartOn("2026-07-13")).toBe("2026-07-12");
    expect(weekStartOn("2026-07-15")).toBe("2026-07-12");
    expect(weekStartOn("2026-07-18")).toBe("2026-07-12");
  });

  it("starts a new week on Sunday", () => {
    expect(weekStartOn("2026-07-19")).toBe("2026-07-19");
  });

  it("crosses month boundaries", () => {
    // 2026-08-01 is Saturday → week starts Sunday 2026-07-26
    expect(weekStartOn("2026-08-01")).toBe("2026-07-26");
    expect(weekEndOn("2026-07-26")).toBe("2026-08-01");
  });

  it("crosses year boundaries", () => {
    // 2027-01-01 is Friday → Sunday 2026-12-27
    expect(weekStartOn("2027-01-01")).toBe("2026-12-27");
    expect(weekEndOn("2026-12-27")).toBe("2027-01-02");
  });

  it("handles leap-day weeks", () => {
    // 2024-02-29 is Thursday → Sunday 2024-02-25
    expect(weekStartOn("2024-02-29")).toBe("2024-02-25");
    expect(daysInWeek("2024-02-25")).toEqual([
      "2024-02-25",
      "2024-02-26",
      "2024-02-27",
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
      "2024-03-02",
    ]);
  });
});

describe("resolveWeekStartParam", () => {
  const fixedNow = new Date(2026, 6, 15); // Wed Jul 15, 2026 local

  it("defaults missing/invalid to the current local week Sunday", () => {
    expect(resolveWeekStartParam(undefined, fixedNow)).toBe("2026-07-12");
    expect(resolveWeekStartParam("", fixedNow)).toBe("2026-07-12");
    expect(resolveWeekStartParam("not-a-date", fixedNow)).toBe("2026-07-12");
    expect(resolveWeekStartParam("2026-13-40", fixedNow)).toBe("2026-07-12");
  });

  it("canonicalizes mid-week dates to Sunday", () => {
    expect(resolveWeekStartParam("2026-07-18", fixedNow)).toBe("2026-07-12");
  });
});

describe("shiftWeekStart / labels", () => {
  it("shifts across a month boundary", () => {
    expect(shiftWeekStart("2026-07-26", 1)).toBe("2026-08-02");
    expect(shiftWeekStart("2026-08-02", -1)).toBe("2026-07-26");
  });

  it("formats a week label", () => {
    expect(formatWeekLabel("2026-07-12")).toMatch(/Jul 12/);
    expect(formatWeekLabel("2026-07-26")).toMatch(/Jul 26/);
    expect(formatWeekLabel("2026-07-26")).toMatch(/Aug/);
  });

  it("currentWeekStart matches todayIsoDate's Sunday", () => {
    const now = new Date(2026, 6, 19); // Sunday
    expect(currentWeekStart(now)).toBe(weekStartOn(todayIsoDate(now)));
    expect(currentWeekStart(now)).toBe("2026-07-19");
  });
});

describe("createPlannedMealInputSchema", () => {
  it("requires recipe or custom title", () => {
    const missing = createPlannedMealInputSchema.safeParse({
      planDate: "2026-07-13",
      mealSlot: "dinner",
      notes: "",
    });
    expect(missing.success).toBe(false);

    const withRecipe = createPlannedMealInputSchema.safeParse({
      planDate: "2026-07-13",
      mealSlot: "dinner",
      recipeId: "66666666-6666-4666-8666-666666666666",
      notes: "",
    });
    expect(withRecipe.success).toBe(true);

    const withTitle = createPlannedMealInputSchema.safeParse({
      planDate: "2026-07-13",
      mealSlot: "snack",
      title: "Takeout",
      notes: "spicy",
    });
    expect(withTitle.success).toBe(true);
  });

  it("rejects the hidden other slot on writes", () => {
    const result = createPlannedMealInputSchema.safeParse({
      planDate: "2026-07-13",
      mealSlot: "other",
      title: "X",
      notes: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPlannedMealsInputSchema", () => {
  it("accepts multiple unique days", () => {
    const result = createPlannedMealsInputSchema.safeParse({
      planDates: ["2026-07-13", "2026-07-15", "2026-07-17"],
      mealSlot: "dinner",
      recipeId: "66666666-6666-4666-8666-666666666666",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one day", () => {
    const result = createPlannedMealsInputSchema.safeParse({
      planDates: [],
      mealSlot: "dinner",
      title: "Soup",
      notes: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("mapPlannedMeal / ordering helpers", () => {
  it("maps rows and preserves title snapshot", () => {
    const meal = mapPlannedMeal({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      household_id: "11111111-1111-4111-8111-111111111111",
      plan_date: "2026-07-13",
      meal_slot: "dinner",
      recipe_id: null,
      custom_title: "Leftovers",
      servings: 2,
      notes: "",
      sort_order: 0,
      created_at: "2026-07-13T12:00:00.000Z",
      recipe: null,
    });
    expect(meal.title).toBe("Leftovers");
    expect(meal.recipeArchived).toBe(false);
  });

  it("orders by sort_order then created_at then id", () => {
    const base = {
      planDate: "2026-07-13",
      mealSlot: "dinner" as const,
      createdAt: "2026-07-13T12:00:00.000Z",
    };
    const a = {
      ...base,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      sortOrder: 1,
    } as PlannedMeal;
    const b = {
      ...base,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      sortOrder: 0,
    } as PlannedMeal;
    expect(comparePlannedMeals(a, b)).toBeGreaterThan(0);
  });
});
