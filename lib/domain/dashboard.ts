import {
  currentMonthStart,
  formatCents,
  type BudgetCategory,
  type BudgetMonthSnapshot,
  type Transaction,
} from "@/lib/domain/budget";
import {
  buildCalendarDayViewModel,
  type CalendarDayEvent,
  type CalendarDayViewModel,
} from "@/lib/domain/calendar";
import { todayIsoDate } from "@/lib/domain/dates";
import {
  comparePlannedMeals,
  currentWeekStart,
  daysInWeek,
  mealSlotLabel,
  type PlannedMeal,
} from "@/lib/domain/meal-plan";
import {
  shoppingProgress,
  type GroceryList,
  type GroceryListItem,
} from "@/lib/domain/shopping";

export const DASHBOARD_RECENT_TRANSACTION_LIMIT = 3;
export const DASHBOARD_RECENT_RECIPE_LIMIT = 3;

export type DashboardMealSummary = {
  id: string;
  title: string;
  mealSlot: string;
  mealSlotLabel: string;
  recipeId: string | null;
  /** Signed recipe cover URL when the meal links to a recipe with an image. */
  imageUrl: string | null;
};

export type DashboardGroceryStatus =
  "no_list" | "empty" | "active" | "complete";

export type DashboardGrocerySummary = {
  weekStart: string;
  listExists: boolean;
  listId: string | null;
  status: DashboardGroceryStatus;
  checked: number;
  total: number;
  remaining: number;
  progressPercent: number;
};

export type DashboardRecentTransaction = {
  id: string;
  occurredOn: string;
  amountCents: number;
  direction: "in" | "out";
  payee: string;
  categoryName: string;
};

export type DashboardBudgetSummary = {
  monthStart: string;
  hasBudgetSetup: boolean;
  actualOutCents: number;
  plannedTotalCents: number;
  remainingOutCents: number;
  remainingLabel: string;
  remainingTone: "ok" | "danger" | "muted";
  spendingProgressPercent: number;
  recentTransactions: DashboardRecentTransaction[];
};

export type DashboardMealWeekSummary = {
  weekStart: string;
  mealCount: number;
  daysMissingMeals: number;
  missingDayIsos: string[];
};

export type DashboardRecipeSummary = {
  id: string;
  name: string;
};

export type DashboardHouseholdSummary = {
  id: string;
  name: string;
  memberCount: number;
};

export type DashboardViewModel = {
  asOf: {
    todayIso: string;
    weekStart: string;
    monthStart: string;
  };
  /** Household calendar day (events only — never meals). Omitted when calendar is disabled. */
  today?: CalendarDayViewModel;
  /** Meals planned to eat today (Meal Planning card). */
  todayMeals: DashboardMealSummary[];
  budget: DashboardBudgetSummary;
  mealWeek: DashboardMealWeekSummary;
};

export function clampProgressPercent(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }
  if (raw <= 0) {
    return 0;
  }
  if (raw >= 100) {
    return 100;
  }
  return Math.round(raw);
}

function toMealSummary(
  meal: PlannedMeal,
  imageUrl: string | null,
): DashboardMealSummary {
  return {
    id: meal.id,
    title: meal.title,
    mealSlot: meal.mealSlot,
    mealSlotLabel: mealSlotLabel(meal.mealSlot),
    recipeId: meal.recipeId,
    imageUrl,
  };
}

export function buildTodayMealsViewModel(args: {
  todayIso: string;
  weekMeals: PlannedMeal[];
  /** Signed cover URLs keyed by recipe id. */
  imageByRecipeId?: Map<string, string | null> | Record<string, string | null>;
}): DashboardMealSummary[] {
  const imageLookup = (recipeId: string | null): string | null => {
    if (!recipeId || !args.imageByRecipeId) {
      return null;
    }
    if (args.imageByRecipeId instanceof Map) {
      return args.imageByRecipeId.get(recipeId) ?? null;
    }
    return args.imageByRecipeId[recipeId] ?? null;
  };

  return args.weekMeals
    .filter((meal) => meal.planDate === args.todayIso)
    .slice()
    .sort(comparePlannedMeals)
    .map((meal) => toMealSummary(meal, imageLookup(meal.recipeId)));
}

/** Calendar day for the Dashboard Today panel (events only). */
export function buildTodayCalendarViewModel(args: {
  todayIso: string;
  events?: CalendarDayEvent[];
}): CalendarDayViewModel {
  return buildCalendarDayViewModel({
    dateIso: args.todayIso,
    events: args.events ?? [],
  });
}

export function buildGroceryCardViewModel(args: {
  weekStart: string;
  list: GroceryList | null;
  items: GroceryListItem[];
}): DashboardGrocerySummary {
  if (!args.list) {
    return {
      weekStart: args.weekStart,
      listExists: false,
      listId: null,
      status: "no_list",
      checked: 0,
      total: 0,
      remaining: 0,
      progressPercent: 0,
    };
  }

  const { checked, total } = shoppingProgress(args.items);
  const remaining = total - checked;

  let status: DashboardGroceryStatus;
  if (total === 0) {
    status = "empty";
  } else if (remaining === 0) {
    status = "complete";
  } else {
    status = "active";
  }

  const progressPercent =
    total === 0 ? 0 : clampProgressPercent((checked / total) * 100);

  return {
    weekStart: args.weekStart,
    listExists: true,
    listId: args.list.id,
    status,
    checked,
    total,
    remaining,
    progressPercent,
  };
}

export function buildBudgetCardViewModel(args: {
  monthStart: string;
  snapshot: BudgetMonthSnapshot;
  categories: BudgetCategory[];
  transactions: Transaction[];
  recentLimit?: number;
}): DashboardBudgetSummary {
  const limit = args.recentLimit ?? DASHBOARD_RECENT_TRANSACTION_LIMIT;
  const categoryNames = new Map(
    args.categories.map((category) => [category.id, category.name]),
  );

  const recentTransactions = args.transactions
    .slice()
    .sort((a, b) => {
      if (a.occurredOn !== b.occurredOn) {
        return a.occurredOn < b.occurredOn ? 1 : -1;
      }
      return a.id < b.id ? 1 : -1;
    })
    .slice(0, limit)
    .map((txn) => ({
      id: txn.id,
      occurredOn: txn.occurredOn,
      amountCents: txn.amountCents,
      direction: txn.direction,
      payee: txn.payee.trim() || "Transaction",
      categoryName: categoryNames.get(txn.categoryId) ?? "Category",
    }));

  const { plannedTotalCents, actualOutCents, remainingOutCents } =
    args.snapshot;
  const hasBudgetSetup = plannedTotalCents > 0;

  let remainingTone: DashboardBudgetSummary["remainingTone"] = "muted";
  let remainingLabel = formatCents(remainingOutCents);
  if (hasBudgetSetup) {
    if (remainingOutCents < 0) {
      remainingTone = "danger";
      remainingLabel = `Over by ${formatCents(Math.abs(remainingOutCents))}`;
    } else {
      remainingTone = "ok";
      remainingLabel = `${formatCents(remainingOutCents)} left`;
    }
  }

  const spendingProgressPercent =
    plannedTotalCents <= 0
      ? 0
      : clampProgressPercent((actualOutCents / plannedTotalCents) * 100);

  return {
    monthStart: args.monthStart,
    hasBudgetSetup,
    actualOutCents,
    plannedTotalCents,
    remainingOutCents,
    remainingLabel,
    remainingTone,
    spendingProgressPercent,
    recentTransactions,
  };
}

export function buildMealWeekCardViewModel(args: {
  weekStart: string;
  weekMeals: PlannedMeal[];
}): DashboardMealWeekSummary {
  const days = daysInWeek(args.weekStart);
  const daysWithMeals = new Set(args.weekMeals.map((meal) => meal.planDate));
  const missingDayIsos = days.filter((day) => !daysWithMeals.has(day));

  return {
    weekStart: args.weekStart,
    mealCount: args.weekMeals.length,
    daysMissingMeals: missingDayIsos.length,
    missingDayIsos,
  };
}

export function buildRecipesRecentCardViewModel(args: {
  recipes: Array<{ id: string; name: string }>;
  limit?: number;
}): DashboardRecipeSummary[] {
  const limit = args.limit ?? DASHBOARD_RECENT_RECIPE_LIMIT;
  return args.recipes.slice(0, limit).map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
  }));
}

export function buildHouseholdCardViewModel(args: {
  id: string;
  name: string;
  memberCount: number;
}): DashboardHouseholdSummary {
  return {
    id: args.id,
    name: args.name,
    memberCount: Math.max(0, args.memberCount),
  };
}

export function resolveDashboardAsOf(now = new Date()): {
  todayIso: string;
  weekStart: string;
  monthStart: string;
} {
  return {
    todayIso: todayIsoDate(now),
    weekStart: currentWeekStart(now),
    monthStart: currentMonthStart(now),
  };
}
