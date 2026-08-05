import {
  ingredientNameKey,
  normalizeIngredientName,
} from "@/lib/domain/recipe";
import { mapWorkbookUnit } from "@/lib/import/workbook/unit-aliases";
import type {
  ParsedBudgetCategory,
  ParsedBudgetLimit,
  ParsedIngredientCatalogRow,
  ParsedRecipe,
  ParsedSubscription,
  ParsedWorkbook,
} from "@/lib/import/workbook/types";

function normalizeCatalogRow(
  row: ParsedIngredientCatalogRow,
): ParsedIngredientCatalogRow {
  const { unit } = mapWorkbookUnit(row.defaultUnit);
  return {
    ...row,
    name: normalizeIngredientName(row.name),
    storeSection: row.storeSection.trim(),
    defaultUnit: unit,
  };
}

function dedupeCatalog(
  rows: ParsedIngredientCatalogRow[],
  warnings: string[],
): ParsedIngredientCatalogRow[] {
  const byKey = new Map<string, ParsedIngredientCatalogRow>();
  for (const row of rows.map(normalizeCatalogRow)) {
    const key = ingredientNameKey(row.name);
    const existing = byKey.get(key);
    if (existing) {
      warnings.push(
        `Duplicate Setup ingredient "${row.name}" (rows ${existing.row}, ${row.row}) — keeping first.`,
      );
      continue;
    }
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

function normalizeRecipeIngredients(
  recipe: ParsedRecipe,
  warnings: string[],
): ParsedRecipe {
  const seen = new Set<string>();
  const ingredients = recipe.ingredients
    .map((line) => {
      const name = normalizeIngredientName(line.name);
      const { unit, mapped } = mapWorkbookUnit(line.unit);
      if (!mapped && line.unit.trim()) {
        warnings.push(
          `Recipe "${recipe.name}": unmapped unit "${line.unit}" for "${name}".`,
        );
      }
      return {
        ...line,
        name,
        unit,
        storeSection: line.storeSection.trim(),
      };
    })
    .filter((line) => {
      const key = `${ingredientNameKey(line.name)}|${line.quantity ?? ""}|${line.unit}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((line, index) => ({ ...line, sortOrder: index }));

  return { ...recipe, name: recipe.name.trim(), ingredients };
}

function dedupeRecipes(
  recipes: ParsedRecipe[],
  warnings: string[],
): ParsedRecipe[] {
  const byKey = new Map<string, ParsedRecipe>();
  for (const recipe of recipes.map((r) =>
    normalizeRecipeIngredients(r, warnings),
  )) {
    const key = recipe.name.trim().toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      warnings.push(
        `Duplicate recipe "${recipe.name}" — keeping ${existing.column}${existing.sheetRow}.`,
      );
      continue;
    }
    byKey.set(key, recipe);
  }
  return [...byKey.values()];
}

function normalizeSubscriptionVendor(vendor: string): string {
  const trimmed = vendor.trim();
  if (trimmed.toLowerCase() === "youtube") {
    return "YouTube";
  }
  return trimmed;
}

function normalizeSubscription(row: ParsedSubscription): ParsedSubscription {
  return {
    ...row,
    vendor: normalizeSubscriptionVendor(row.vendor),
    categoryLabel: row.categoryLabel.trim(),
  };
}

function dedupeSubscriptions(
  rows: ParsedSubscription[],
  warnings: string[],
): ParsedSubscription[] {
  const byKey = new Map<string, ParsedSubscription>();
  for (const row of rows.map(normalizeSubscription)) {
    const key = row.vendor.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      warnings.push(
        `Duplicate subscription vendor "${row.vendor}" — keeping row ${existing.row}.`,
      );
      continue;
    }
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

function dedupeBudgetCategories(
  rows: ParsedBudgetCategory[],
  warnings: string[],
): ParsedBudgetCategory[] {
  const byKey = new Map<string, ParsedBudgetCategory>();
  for (const row of rows) {
    const key = `${row.kind}|${row.name.trim().toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      warnings.push(
        `Duplicate budget category "${row.name}" (${row.kind}) — keeping ${existing.source}.`,
      );
      continue;
    }
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

function dedupeBudgetLimits(
  rows: ParsedBudgetLimit[],
  warnings: string[],
): ParsedBudgetLimit[] {
  const byKey = new Map<string, ParsedBudgetLimit>();
  for (const row of rows) {
    const key = `${row.monthStart}|${row.categoryKind}|${row.categoryName.trim().toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      warnings.push(
        `Duplicate budget limit for "${row.categoryName}" (${row.monthStart}) — keeping ${existing.source}.`,
      );
      continue;
    }
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

export function normalizeWorkbook(parsed: ParsedWorkbook): ParsedWorkbook {
  const warnings = [...parsed.warnings];
  return {
    ...parsed,
    ingredients: dedupeCatalog(parsed.ingredients, warnings),
    recipes: dedupeRecipes(parsed.recipes, warnings),
    subscriptions: dedupeSubscriptions(parsed.subscriptions, warnings),
    budgetCategories: dedupeBudgetCategories(parsed.budgetCategories, warnings),
    budgetLimits: dedupeBudgetLimits(parsed.budgetLimits, warnings),
    warnings,
  };
}
