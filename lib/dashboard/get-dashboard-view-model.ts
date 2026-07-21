import "server-only";

import { getCalendarDayViewModel } from "@/lib/calendar/get-calendar-day-view-model";
import {
  buildBudgetMonthSnapshot,
  currentMonthStart,
} from "@/lib/domain/budget";
import {
  buildBudgetCardViewModel,
  buildMealWeekCardViewModel,
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
 * Today uses the shared calendar day composer (native events + visible
 * subscription renewals). Meals feed the Meal Planning card only.
 */
export async function getDashboardViewModel(
  now = new Date(),
): Promise<DashboardViewModel> {
  const asOf = resolveDashboardAsOf(now);
  const monthStart = currentMonthStart(now);

  const [weekMeals, recipes, categories, limits, transactions, today] =
    await Promise.all([
      listPlannedMealsForWeek(asOf.weekStart),
      // Covers needed for today's meal cards (signed URLs).
      listRecipes({ sort: "name" }),
      listCategories(),
      listMonthLimits(monthStart),
      listTransactionsForMonth(monthStart),
      getCalendarDayViewModel({ dateIso: asOf.todayIso, now }),
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
    today,
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
