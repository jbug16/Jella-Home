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
import { listRecipeCoverUrlsByIds } from "@/lib/repositories/recipes";

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

  const [weekMeals, categories, limits, transactions, today] =
    await Promise.all([
      listPlannedMealsForWeek(asOf.weekStart),
      listCategories(),
      listMonthLimits(monthStart),
      listTransactionsForMonth(monthStart),
      getCalendarDayViewModel({ dateIso: asOf.todayIso, now }),
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
