import { describe, expect, it } from "vitest";

import {
  buildWorkbookExtract,
  buildExtractSummary,
} from "@/lib/import/workbook";
import { mapWorkbookUnit } from "@/lib/import/workbook/unit-aliases";
import { normalizeWorkbook } from "@/lib/import/workbook/normalize";
import { validateWorkbook } from "@/lib/import/workbook/validate";
import type { ParsedWorkbook } from "@/lib/import/workbook/types";

const sampleWorkbook: ParsedWorkbook = {
  workbookPath: "fixture.xlsx",
  sheetNames: [
    "Setup",
    "Recipe Management",
    "Subscription Tracker",
    "Back-end",
    "Monthly Budget",
    "Log",
  ],
  ingredients: [
    {
      row: 10,
      name: "Rice",
      storeSection: "PANTRY",
      defaultUnit: "cup",
    },
  ],
  recipes: [
    {
      sheetRow: 5,
      column: "B",
      name: "Rice Bowl",
      servings: 4,
      prepTimeMinutes: 3,
      cookTimeMinutes: 25,
      sourceUrl: "https://example.com/rice",
      instructions: "",
      notes: "",
      ingredients: [
        {
          name: "Water",
          quantity: 2,
          unit: "cup",
          sortOrder: 0,
          storeSection: "BEVERAGES",
        },
        {
          name: "Rice",
          quantity: 1,
          unit: "cup",
          sortOrder: 1,
          storeSection: "PANTRY",
        },
      ],
    },
  ],
  subscriptions: [
    {
      row: 11,
      vendor: "Tailscale",
      categoryLabel: "Tech",
      cadence: "monthly",
      amountCents: 500,
      autoRenew: true,
      billingDay: null,
      renewalOn: null,
    },
  ],
  budgetCategories: [
    {
      name: "Groceries",
      kind: "expense",
      sortOrder: 0,
      source: "Back-end!D3",
    },
  ],
  budgetLimits: [
    {
      categoryName: "Groceries",
      categoryKind: "expense",
      monthStart: "2026-07-01",
      limitCents: 50000,
      source: "Monthly Budget row 16",
    },
  ],
  transactions: [],
  skippedRecipes: [
    {
      name: "Empty Recipe",
      reason: "no ingredient lines",
      source: "Recipe Management K61",
    },
  ],
  warnings: [],
};

describe("mapWorkbookUnit", () => {
  it("maps common aliases", () => {
    expect(mapWorkbookUnit("lbs")).toEqual({ unit: "lb", mapped: true });
    expect(mapWorkbookUnit("unit")).toEqual({ unit: "piece", mapped: true });
  });

  it("passes through approved units", () => {
    expect(mapWorkbookUnit("tbsp")).toEqual({ unit: "tbsp", mapped: true });
  });
});

describe("normalizeWorkbook", () => {
  it("dedupes duplicate ingredient lines on a recipe", () => {
    const parsed: ParsedWorkbook = {
      ...sampleWorkbook,
      recipes: [
        {
          ...sampleWorkbook.recipes[0]!,
          ingredients: [
            ...sampleWorkbook.recipes[0]!.ingredients,
            {
              name: "Water",
              quantity: 2,
              unit: "cup",
              sortOrder: 2,
              storeSection: "BEVERAGES",
            },
          ],
        },
      ],
    };
    const normalized = normalizeWorkbook(parsed);
    expect(normalized.recipes[0]?.ingredients).toHaveLength(2);
  });
});

describe("validateWorkbook", () => {
  it("accepts a minimal valid workbook", () => {
    const normalized = normalizeWorkbook(sampleWorkbook);
    const result = validateWorkbook(normalized);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("buildWorkbookExtract", () => {
  it("produces insert-ready rows for all domains", () => {
    const normalized = normalizeWorkbook(sampleWorkbook);
    const extract = buildWorkbookExtract(normalized);

    expect(extract.ingredients).toHaveLength(2);
    expect(extract.recipes).toHaveLength(1);
    expect(extract.recipe_ingredients).toHaveLength(2);
    expect(extract.subscriptions[0]).toMatchObject({
      vendor: "Tailscale",
      renewal_on: null,
      billing_day: 1,
      status: "active",
    });
    expect(extract.budget_categories).toHaveLength(1);
    expect(extract.budget_limits).toHaveLength(1);
  });

  it("normalizes Youtube vendor to YouTube", () => {
    const parsed: ParsedWorkbook = {
      ...sampleWorkbook,
      subscriptions: [
        {
          row: 12,
          vendor: "Youtube",
          categoryLabel: "Entertainment",
          cadence: "monthly",
          amountCents: 1600,
          autoRenew: true,
          billingDay: null,
          renewalOn: null,
        },
      ],
    };
    const normalized = normalizeWorkbook(parsed);
    expect(normalized.subscriptions[0]?.vendor).toBe("YouTube");
  });

  it("builds a summary with skipped recipes and missing renewal dates", () => {
    const normalized = normalizeWorkbook(sampleWorkbook);
    const extract = buildWorkbookExtract(normalized);
    const summary = buildExtractSummary({
      parsed: normalized,
      extract,
      outputDirectory: "/tmp/extract",
      validationWarnings: [],
    });

    expect(summary.counts.recipes).toBe(1);
    expect(summary.recipes_skipped_no_ingredients).toHaveLength(1);
    expect(summary.subscriptions_missing_renewal_dates).toEqual(["Tailscale"]);
    expect(summary.counts.subscription_monthly_equivalent_cents).toBe(500);
  });
});
