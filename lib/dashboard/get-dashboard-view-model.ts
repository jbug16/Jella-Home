import "server-only";

import {
  buildBudgetMonthSnapshot,
  currentMonthStart,
} from "@/lib/domain/budget";
import {
  buildBudgetCardViewModel,
  buildMealWeekCardViewModel,
  buildTodayCalendarViewModel,
  buildTodayMealsViewModel,
  resolveDashboardAsOf,
  type DashboardViewModel,
} from "@/lib/domain/dashboard";
import {
  listCategories,
  listMonthLimits,
  listTransactionsForMonth,
} from "@/lib/repositories/budget";
import { listPlannedMealsForWeek } from "@/lib/repositories/meal-plans";
import { listRecipes } from "@/lib/repositories/recipes";

/**
 * Compose the Dashboard home view model.
 * Today uses household calendar events (empty until Calendar writes exist).
 * Meals for today feed the Meal Planning card only — never the calendar grid.
 */
export async function getDashboardViewModel(
  now = new Date(),
): Promise<DashboardViewModel> {
  const asOf = resolveDashboardAsOf(now);
  const monthStart = currentMonthStart(now);

  const [weekMeals, recipes, categories, limits, transactions] =
    await Promise.all([
      listPlannedMealsForWeek(asOf.weekStart),
      // Covers needed for today's meal cards (signed URLs).
      listRecipes({ sort: "name" }),
      listCategories(),
      listMonthLimits(monthStart),
      listTransactionsForMonth(monthStart),
    ]);

  const imageByRecipeId = new Map(
    recipes.map((recipe) => [recipe.id, recipe.imageUrl]),
  );

  const snapshot = buildBudgetMonthSnapshot({
    monthStart,
    categories,
    limits,
    transactions,
  });

  return {
    asOf: {
      todayIso: asOf.todayIso,
      weekStart: asOf.weekStart,
      monthStart,
    },
    today: buildTodayCalendarViewModel({
      todayIso: asOf.todayIso,
      events: [],
    }),
    todayMeals: buildTodayMealsViewModel({
      todayIso: asOf.todayIso,
      weekMeals,
      imageByRecipeId,
    }),
    budget: buildBudgetCardViewModel({
      monthStart,
      snapshot,
      categories,
      transactions,
    }),
    mealWeek: buildMealWeekCardViewModel({
      weekStart: asOf.weekStart,
      weekMeals,
    }),
  };
}
