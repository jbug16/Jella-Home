import { z } from "zod";

import { createSubscriptionPersistedSchema } from "@/lib/domain/subscription";
import { ingredientNameKey } from "@/lib/domain/recipe";
import type { ParsedWorkbook } from "@/lib/import/workbook/types";

const catalogRowSchema = z.object({
  row: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  storeSection: z.string().max(80),
  defaultUnit: z.string().max(40),
});

const recipeLineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().nullable(),
  unit: z.string().max(40),
  sortOrder: z.number().int().nonnegative(),
  storeSection: z.string().max(80),
});

const recipeSchema = z.object({
  sheetRow: z.number().int().positive(),
  column: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  servings: z.number().positive(),
  prepTimeMinutes: z.number().int().nonnegative().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().nullable(),
  sourceUrl: z.string().url().nullable().or(z.literal(null)),
  instructions: z.string().max(10_000),
  notes: z.string().max(2_000),
  ingredients: z.array(recipeLineSchema).min(1).max(100),
});

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function validateWorkbook(parsed: ParsedWorkbook): ValidationResult {
  const errors: string[] = [];
  const warnings = [...parsed.warnings];

  if (parsed.ingredients.length === 0 && parsed.recipes.length === 0) {
    errors.push("Workbook contains no importable ingredients or recipes.");
  }

  for (const row of parsed.ingredients) {
    const result = catalogRowSchema.safeParse(row);
    if (!result.success) {
      errors.push(
        `Setup row ${row.row}: invalid ingredient — ${result.error.issues[0]?.message ?? "invalid"}.`,
      );
    }
  }

  for (const recipe of parsed.recipes) {
    const result = recipeSchema.safeParse({
      ...recipe,
      sourceUrl: recipe.sourceUrl,
    });
    if (!result.success) {
      errors.push(
        `Recipe ${recipe.column}${recipe.sheetRow} (${recipe.name}): ${result.error.issues[0]?.message ?? "invalid"}.`,
      );
    }

    for (const line of recipe.ingredients) {
      if (!ingredientNameKey(line.name)) {
        errors.push(`Recipe "${recipe.name}": blank ingredient name.`);
      }
    }
  }

  for (const sub of parsed.subscriptions) {
    const persist = createSubscriptionPersistedSchema.safeParse({
      vendor: sub.vendor,
      categoryLabel: sub.categoryLabel,
      amountCents: sub.amountCents,
      cadence: sub.cadence,
      renewalOn: sub.renewalOn ?? "2099-01-01",
      notes:
        sub.autoRenew === null
          ? ""
          : sub.autoRenew
            ? "Auto-renew"
            : "No auto-renew",
      billingDay: sub.billingDay ?? 1,
    });
    if (!sub.renewalOn) {
      warnings.push(`Subscription "${sub.vendor}": no renewal_on in workbook.`);
    }
    if (!persist.success) {
      errors.push(
        `Subscription row ${sub.row} (${sub.vendor}): ${persist.error.issues[0]?.message ?? "invalid"}.`,
      );
    }
  }

  const ingredientKeys = new Set(
    parsed.ingredients.map((row) => ingredientNameKey(row.name)),
  );
  for (const recipe of parsed.recipes) {
    for (const line of recipe.ingredients) {
      const key = ingredientNameKey(line.name);
      if (!ingredientKeys.has(key)) {
        warnings.push(
          `Ingredient "${line.name}" used in "${recipe.name}" but absent from Setup catalog — will create on import.`,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
