import "server-only";

import {
  buildBudgetMonthSnapshot,
  currentMonthStart,
} from "@/lib/domain/budget";
import {
  buildBudgetCardViewModel,
  buildDashboardCountdownsViewModel,
  buildMealWeekCardViewModel,
  buildTodayMealsViewModel,
  resolveDashboardAsOf,
  type DashboardViewModel,
} from "@/lib/domain/dashboard";
import { listCountdowns } from "@/lib/repositories/countdowns";
import {
  listCategories,
  listMonthLimits,
  listTransactionsForMonth,
} from "@/lib/repositories/budget";
import { listPlannedMealsForWeek } from "@/lib/repositories/meal-plans";
import { listRecipeCoverUrlsByIds } from "@/lib/repositories/recipes";

/**
 * Compose the Dashboard home view model.
 * Meals, budget, and countdowns remain owned by their feature repositories.
 */
export async function getDashboardViewModel(
  now = new Date(),
): Promise<DashboardViewModel> {
  const asOf = resolveDashboardAsOf(now);
  const monthStart = currentMonthStart(now);

  const [weekMeals, categories, limits, transactions, countdownRows] =
    await Promise.all([
      listPlannedMealsForWeek(asOf.weekStart),
      listCategories(),
      listMonthLimits(monthStart),
      listTransactionsForMonth(monthStart),
      listCountdowns(),
    ]);

  const todayRecipeIds = weekMeals
    .filter((meal) => meal.planDate === asOf.todayIso && meal.recipeId)
    .map((meal) => meal.recipeId as string);

  const imageByRecipeId = await listRecipeCoverUrlsByIds(todayRecipeIds);

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
    countdowns: buildDashboardCountdownsViewModel({
      todayIso: asOf.todayIso,
      countdowns: countdownRows,
    }),
    todayMeals: buildTodayMealsViewModel({
      todayIso: asOf.todayIso,
      weekMeals,
      imageByRecipeId,
    }),
    budget: buildBudgetCardViewModel({
      monthStart,
      snapshot,
    }),
    mealWeek: buildMealWeekCardViewModel({
      weekStart: asOf.weekStart,
      weekMeals,
    }),
  };
}
