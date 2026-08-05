import { describe, expect, it } from "vitest";

import { buildBudgetMonthSnapshot } from "@/lib/domain/budget";
import {
  buildBudgetCardViewModel,
  buildGroceryCardViewModel,
  buildHouseholdCardViewModel,
  buildMealWeekCardViewModel,
  buildRecipesRecentCardViewModel,
  buildTodayMealsViewModel,
  clampProgressPercent,
  resolveDashboardAsOf,
} from "@/lib/domain/dashboard";
import { weekStartOn, type PlannedMeal } from "@/lib/domain/meal-plan";
import type { GroceryList, GroceryListItem } from "@/lib/domain/shopping";

const HOUSEHOLD = "11111111-1111-4111-8111-111111111111";

function meal(
  overrides: Partial<PlannedMeal> & Pick<PlannedMeal, "planDate" | "title">,
): PlannedMeal {
  return {
    id: overrides.id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    householdId: HOUSEHOLD,
    planDate: overrides.planDate,
    mealSlot: overrides.mealSlot ?? "dinner",
    recipeId: overrides.recipeId ?? null,
    title: overrides.title,
    servings: 2,
    notes: "",
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: "2026-07-13T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-07-13T12:00:00.000Z",
    recipeName: null,
    recipeArchived: false,
  };
}

function item(
  overrides: Partial<GroceryListItem> & Pick<GroceryListItem, "id" | "name">,
): GroceryListItem {
  return {
    id: overrides.id,
    householdId: HOUSEHOLD,
    listId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: overrides.name,
    quantity: 1,
    unit: "",
    storeSection: "",
    isChecked: overrides.isChecked ?? false,
    source: "manual",
    ingredientId: null,
    recipeId: null,
    notes: "",
    generationKey: null,
    sortOrder: 0,
    updatedAt: overrides.updatedAt ?? "2026-07-13T12:00:00.000Z",
  };
}

const list: GroceryList = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  householdId: HOUSEHOLD,
  name: "Shopping",
  weekStartOn: "2026-07-12",
  status: "active",
};

describe("resolveDashboardAsOf / Sunday week boundaries", () => {
  it("anchors mid-week to Sunday across a month boundary", () => {
    // Wednesday 2026-07-01 → Sunday 2026-06-28
    const asOf = resolveDashboardAsOf(new Date(2026, 6, 1, 12, 0, 0));
    expect(asOf.todayIso).toBe("2026-07-01");
    expect(asOf.weekStart).toBe("2026-06-28");
    expect(asOf.monthStart).toBe("2026-07-01");
    expect(weekStartOn(asOf.todayIso)).toBe(asOf.weekStart);
  });

  it("anchors across a year boundary", () => {
    // Friday 2027-01-01 → Sunday 2026-12-27
    const asOf = resolveDashboardAsOf(new Date(2027, 0, 1, 12, 0, 0));
    expect(asOf.todayIso).toBe("2027-01-01");
    expect(asOf.weekStart).toBe("2026-12-27");
    expect(asOf.monthStart).toBe("2027-01-01");
  });

  it("keeps a Sunday as the week start", () => {
    const asOf = resolveDashboardAsOf(new Date(2026, 6, 12, 9, 0, 0));
    expect(asOf.todayIso).toBe("2026-07-12");
    expect(asOf.weekStart).toBe("2026-07-12");
  });
});

describe("clampProgressPercent", () => {
  it("clamps visual progress only", () => {
    expect(clampProgressPercent(-10)).toBe(0);
    expect(clampProgressPercent(0)).toBe(0);
    expect(clampProgressPercent(37.4)).toBe(37);
    expect(clampProgressPercent(100)).toBe(100);
    expect(clampProgressPercent(250)).toBe(100);
    expect(clampProgressPercent(Number.NaN)).toBe(0);
  });
});

describe("buildTodayMealsViewModel", () => {
  it("lists only meals for today with recipe ids and images", () => {
    const meals = buildTodayMealsViewModel({
      todayIso: "2026-07-15",
      weekMeals: [
        meal({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          planDate: "2026-07-15",
          title: "Pasta",
          mealSlot: "dinner",
          recipeId: "66666666-6666-4666-8666-666666666666",
        }),
        meal({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
          planDate: "2026-07-14",
          title: "Other day",
        }),
      ],
      imageByRecipeId: {
        "66666666-6666-4666-8666-666666666666":
          "https://example.test/pasta.jpg",
      },
    });
    expect(meals).toHaveLength(1);
    expect(meals[0]?.title).toBe("Pasta");
    expect(meals[0]?.recipeId).toBe("66666666-6666-4666-8666-666666666666");
    expect(meals[0]?.imageUrl).toBe("https://example.test/pasta.jpg");
  });

  it("returns empty when nothing is planned today", () => {
    expect(
      buildTodayMealsViewModel({
        todayIso: "2026-07-15",
        weekMeals: [meal({ planDate: "2026-07-16", title: "Tomorrow" })],
      }),
    ).toEqual([]);
  });
});

describe("buildGroceryCardViewModel", () => {
  it("distinguishes no list from empty list", () => {
    const missing = buildGroceryCardViewModel({
      weekStart: "2026-07-12",
      list: null,
      items: [],
    });
    expect(missing.status).toBe("no_list");
    expect(missing.listExists).toBe(false);

    const empty = buildGroceryCardViewModel({
      weekStart: "2026-07-12",
      list,
      items: [],
    });
    expect(empty.status).toBe("empty");
    expect(empty.listExists).toBe(true);
    expect(empty.total).toBe(0);
  });

  it("computes active and complete progress without clamping counts", () => {
    const active = buildGroceryCardViewModel({
      weekStart: "2026-07-12",
      list,
      items: [
        item({ id: "1", name: "Milk", isChecked: true }),
        item({ id: "2", name: "Eggs", isChecked: false }),
        item({ id: "3", name: "Bread", isChecked: false }),
      ],
    });
    expect(active.status).toBe("active");
    expect(active.checked).toBe(1);
    expect(active.total).toBe(3);
    expect(active.remaining).toBe(2);
    expect(active.progressPercent).toBe(33);

    const complete = buildGroceryCardViewModel({
      weekStart: "2026-07-12",
      list,
      items: [
        item({ id: "1", name: "Milk", isChecked: true }),
        item({ id: "2", name: "Eggs", isChecked: true }),
      ],
    });
    expect(complete.status).toBe("complete");
    expect(complete.remaining).toBe(0);
    expect(complete.progressPercent).toBe(100);
  });
});

describe("buildBudgetCardViewModel", () => {
  const categories = [
    {
      id: "33333333-3333-4333-8333-333333333333",
      householdId: HOUSEHOLD,
      name: "Groceries",
      kind: "expense" as const,
      sortOrder: 0,
      archivedAt: null,
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      householdId: HOUSEHOLD,
      name: "Dining out",
      kind: "expense" as const,
      sortOrder: 1,
      archivedAt: null,
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ];

  it("shows neutral setup when no monthly budget exists", () => {
    const snapshot = buildBudgetMonthSnapshot({
      monthStart: "2026-07-01",
      categories,
      limits: [],
      transactions: [],
    });
    const card = buildBudgetCardViewModel({
      monthStart: "2026-07-01",
      snapshot,
    });
    expect(card.hasBudgetSetup).toBe(false);
    expect(card.remainingTone).toBe("muted");
    expect(card.spendingProgressPercent).toBe(0);
    expect(card.expenseSlices).toEqual([]);
  });

  it("keeps negative remaining unclamped and clamps progress", () => {
    const snapshot = buildBudgetMonthSnapshot({
      monthStart: "2026-07-01",
      categories,
      limits: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          householdId: HOUSEHOLD,
          categoryId: categories[0]!.id,
          monthStart: "2026-07-01",
          limitCents: 1000,
        },
      ],
      transactions: [
        {
          id: "66666666-6666-4666-8666-666666666661",
          householdId: HOUSEHOLD,
          categoryId: categories[0]!.id,
          amountCents: 2500,
          direction: "out",
          occurredOn: "2026-07-02",
          payee: "Store",
          notes: "",
          updatedAt: "2026-07-02T00:00:00.000Z",
        },
      ],
    });
    const card = buildBudgetCardViewModel({
      monthStart: "2026-07-01",
      snapshot,
    });
    expect(card.remainingOutCents).toBe(-1500);
    expect(card.remainingLabel).toContain("Over by");
    expect(card.remainingTone).toBe("danger");
    expect(card.spendingProgressPercent).toBe(100);
    expect(card.expenseSlices).toEqual([
      {
        categoryId: categories[0]!.id,
        name: "Groceries",
        kind: "expense",
        amountCents: 2500,
        sharePercent: 100,
      },
    ]);
  });

  it("builds expense slices by category share", () => {
    const snapshot = buildBudgetMonthSnapshot({
      monthStart: "2026-07-01",
      categories,
      limits: [],
      transactions: [
        {
          id: "66666666-6666-4666-8666-666666666661",
          householdId: HOUSEHOLD,
          categoryId: categories[0]!.id,
          amountCents: 3000,
          direction: "out",
          occurredOn: "2026-07-02",
          payee: "Store",
          notes: "",
          updatedAt: "2026-07-02T00:00:00.000Z",
        },
        {
          id: "66666666-6666-4666-8666-666666666662",
          householdId: HOUSEHOLD,
          categoryId: categories[1]!.id,
          amountCents: 1000,
          direction: "out",
          occurredOn: "2026-07-03",
          payee: "Cafe",
          notes: "",
          updatedAt: "2026-07-03T00:00:00.000Z",
        },
      ],
    });
    const card = buildBudgetCardViewModel({
      monthStart: "2026-07-01",
      snapshot,
    });
    expect(card.expenseSlices).toHaveLength(2);
    expect(card.expenseSlices[0]?.name).toBe("Groceries");
    expect(card.expenseSlices[0]?.sharePercent).toBe(75);
    expect(card.expenseSlices[1]?.name).toBe("Dining out");
    expect(card.expenseSlices[1]?.sharePercent).toBe(25);
  });
});

describe("buildMealWeekCardViewModel", () => {
  it("counts days with zero meals across the Sunday week", () => {
    const weekStart = "2026-07-12";
    const card = buildMealWeekCardViewModel({
      weekStart,
      weekMeals: [
        meal({ planDate: "2026-07-12", title: "Sun" }),
        meal({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
          planDate: "2026-07-14",
          title: "Tue",
        }),
      ],
    });
    expect(card.mealCount).toBe(2);
    expect(card.daysMissingMeals).toBe(5);
    expect(card.missingDayIsos).not.toContain("2026-07-12");
    expect(card.missingDayIsos).toContain("2026-07-13");
  });

  it("reports zero missing when every day has a meal", () => {
    const weekStart = "2026-07-12";
    const weekMeals = [
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
    ].map((planDate, index) =>
      meal({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa${index}`,
        planDate,
        title: planDate,
      }),
    );
    const card = buildMealWeekCardViewModel({ weekStart, weekMeals });
    expect(card.daysMissingMeals).toBe(0);
    expect(card.missingDayIsos).toEqual([]);
  });
});

describe("buildRecipesRecentCardViewModel", () => {
  it("limits to three names", () => {
    const recent = buildRecipesRecentCardViewModel({
      recipes: [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
        { id: "3", name: "C" },
        { id: "4", name: "D" },
      ],
    });
    expect(recent).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
    ]);
  });
});

describe("buildHouseholdCardViewModel", () => {
  it("returns name and member count", () => {
    expect(
      buildHouseholdCardViewModel({
        id: HOUSEHOLD,
        name: "Local Fixture Household A",
        memberCount: 2,
      }),
    ).toEqual({
      id: HOUSEHOLD,
      name: "Local Fixture Household A",
      memberCount: 2,
    });
  });
});
