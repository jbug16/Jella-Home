import { ingredientNameKey } from "@/lib/domain/recipe";
import { monthlyEquivalentCents } from "@/lib/domain/subscription";
import type {
  ExtractedBudgetCategory,
  ExtractedBudgetLimit,
  ExtractedIngredient,
  ExtractedRecipe,
  ExtractedRecipeIngredient,
  ExtractedSubscription,
  ExtractedTransaction,
  ParsedWorkbook,
  WorkbookExtract,
} from "@/lib/import/workbook/types";

function subscriptionNotes(autoRenew: boolean | null): string {
  if (autoRenew === null) {
    return "";
  }
  return autoRenew ? "Auto-renew" : "No auto-renew";
}

export function buildWorkbookExtract(parsed: ParsedWorkbook): WorkbookExtract {
  const ingredientMap = new Map<string, ExtractedIngredient>();

  for (const row of parsed.ingredients) {
    const key = ingredientNameKey(row.name);
    if (!ingredientMap.has(key)) {
      ingredientMap.set(key, {
        name: row.name,
        default_unit: row.defaultUnit,
        store_section: row.storeSection,
      });
    }
  }

  for (const recipe of parsed.recipes) {
    for (const line of recipe.ingredients) {
      const key = ingredientNameKey(line.name);
      if (!ingredientMap.has(key)) {
        ingredientMap.set(key, {
          name: line.name,
          default_unit: line.unit,
          store_section: line.storeSection,
        });
      }
    }
  }

  const ingredients = [...ingredientMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const recipes: ExtractedRecipe[] = parsed.recipes
    .map((recipe) => ({
      name: recipe.name,
      servings: recipe.servings,
      prep_time_minutes: recipe.prepTimeMinutes,
      cook_time_minutes: recipe.cookTimeMinutes,
      instructions: recipe.instructions,
      notes: recipe.notes,
      source_url: recipe.sourceUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const recipe_ingredients: ExtractedRecipeIngredient[] = [];
  for (const recipe of parsed.recipes) {
    for (const line of recipe.ingredients) {
      recipe_ingredients.push({
        recipe_name: recipe.name,
        ingredient_name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        notes: "",
        sort_order: line.sortOrder,
      });
    }
  }

  const subscriptions: ExtractedSubscription[] = parsed.subscriptions
    .map((sub) => ({
      vendor: sub.vendor,
      category_label: sub.categoryLabel,
      amount_cents: sub.amountCents,
      cadence: sub.cadence,
      billing_day: sub.billingDay ?? 1,
      renewal_on: sub.renewalOn,
      status: "active" as const,
      notes: subscriptionNotes(sub.autoRenew),
    }))
    .sort((a, b) => a.vendor.localeCompare(b.vendor));

  const budget_categories: ExtractedBudgetCategory[] = parsed.budgetCategories
    .map((row) => ({
      name: row.name,
      kind: row.kind,
      sort_order: row.sortOrder,
    }))
    .sort((a, b) =>
      a.kind === b.kind
        ? a.sort_order - b.sort_order
        : a.kind.localeCompare(b.kind),
    );

  const budget_limits: ExtractedBudgetLimit[] = parsed.budgetLimits
    .map((row) => ({
      category_name: row.categoryName,
      category_kind: row.categoryKind,
      month_start: row.monthStart,
      limit_cents: row.limitCents,
    }))
    .sort(
      (a, b) =>
        a.month_start.localeCompare(b.month_start) ||
        a.category_kind.localeCompare(b.category_kind) ||
        a.category_name.localeCompare(b.category_name),
    );

  const transactions: ExtractedTransaction[] = [...parsed.transactions]
    .map((row) => ({
      category_kind: row.categoryKind,
      category_name: row.categoryName,
      amount_cents: row.amountCents,
      direction: row.direction,
      occurred_on: row.occurredOn,
      payee: row.payee,
      notes: row.notes,
    }))
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));

  return {
    ingredients,
    recipes,
    recipe_ingredients,
    subscriptions,
    budget_categories,
    budget_limits,
    transactions,
  };
}

export function subscriptionMonthlyEquivalentCents(
  subscriptions: ExtractedSubscription[],
): number {
  return subscriptions.reduce(
    (sum, sub) => sum + monthlyEquivalentCents(sub.amount_cents, sub.cadence),
    0,
  );
}
