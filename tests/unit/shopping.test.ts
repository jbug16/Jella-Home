import { describe, expect, it } from "vitest";

import { weekStartOn } from "@/lib/domain/meal-plan";
import {
  aggregateGroceryLines,
  buildAggregationInputsFromMeals,
  buildGenerationKey,
  createManualItemInputSchema,
  resolveShoppingWeekStart,
  scaleLineQuantity,
  type GroceryAggregationInput,
} from "@/lib/domain/shopping";

describe("shopping week Sunday normalization", () => {
  it("canonicalizes mid-week dates to Sunday across month boundaries", () => {
    // Wednesday 2026-07-01 → Sunday 2026-06-28
    expect(weekStartOn("2026-07-01")).toBe("2026-06-28");
    expect(resolveShoppingWeekStart("2026-07-01")).toBe("2026-06-28");
  });

  it("canonicalizes across year boundaries", () => {
    // Friday 2027-01-01 → Sunday 2026-12-27
    expect(weekStartOn("2027-01-01")).toBe("2026-12-27");
    expect(resolveShoppingWeekStart("2027-01-01")).toBe("2026-12-27");
  });

  it("keeps a Sunday as-is and falls back for invalid input", () => {
    expect(resolveShoppingWeekStart("2026-07-12")).toBe("2026-07-12");
    expect(resolveShoppingWeekStart("not-a-date")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(resolveShoppingWeekStart(undefined)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("scaleLineQuantity", () => {
  it("doubles when planned servings are twice the recipe", () => {
    expect(scaleLineQuantity(200, 2, 4)).toBe(400);
  });

  it("halves when planned servings are half the recipe", () => {
    expect(scaleLineQuantity(200, 4, 2)).toBe(100);
  });

  it("uses recipe servings when planned is null", () => {
    expect(scaleLineQuantity(200, 2, null)).toBe(200);
  });

  it("keeps null quantity as null", () => {
    expect(scaleLineQuantity(null, 2, 4)).toBeNull();
  });
});

describe("buildGenerationKey", () => {
  it("uses ingredient id, normalized unit, and note identity", () => {
    expect(
      buildGenerationKey({
        ingredientId: "88888888-8888-4888-8888-888888888888",
        name: "Spaghetti",
        unit: "G",
        notes: "  Diced ",
      }),
    ).toBe("88888888-8888-4888-8888-888888888888|g|diced");
  });

  it("falls back to n:nameKey without ingredient id", () => {
    expect(
      buildGenerationKey({
        ingredientId: null,
        name: "  Olive Oil ",
        unit: "tbsp",
        notes: "",
      }),
    ).toBe("n:olive oil|tbsp|");
  });
});

describe("aggregateGroceryLines", () => {
  const base: GroceryAggregationInput = {
    ingredientId: "88888888-8888-4888-8888-888888888888",
    name: "Spaghetti",
    quantity: 200,
    unit: "g",
    storeSection: "Pasta",
    notes: "",
    recipeId: "66666666-6666-4666-8666-666666666666",
  };

  it("sums matching ingredient + unit + notes", () => {
    const result = aggregateGroceryLines([base, { ...base, quantity: 100 }]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBe(300);
    expect(result[0]?.generationKey).toBe(
      "88888888-8888-4888-8888-888888888888|g|",
    );
    expect(result[0]?.storeSection).toBe("Pasta");
  });

  it("keeps different units as separate rows", () => {
    const result = aggregateGroceryLines([
      base,
      { ...base, unit: "oz", quantity: 8 },
    ]);
    expect(result).toHaveLength(2);
  });

  it("keeps different notes as separate rows (identical-note-only merge)", () => {
    const result = aggregateGroceryLines([
      { ...base, notes: "diced" },
      { ...base, notes: "chopped" },
    ]);
    expect(result).toHaveLength(2);
  });

  it("is idempotent for the same inputs", () => {
    const inputs = [base, { ...base, quantity: 50, name: "  spaghetti " }];
    expect(aggregateGroceryLines(inputs)).toEqual(
      aggregateGroceryLines(inputs),
    );
  });

  it("returns empty for empty input", () => {
    expect(aggregateGroceryLines([])).toEqual([]);
  });

  it("preserves null quantity when all contributions are to-taste", () => {
    const result = aggregateGroceryLines([
      { ...base, quantity: null },
      { ...base, quantity: null },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBeNull();
  });
});

describe("buildAggregationInputsFromMeals", () => {
  it("scales each meal contribution before aggregation", () => {
    const inputs = buildAggregationInputsFromMeals([
      {
        recipeId: "r1",
        recipeServings: 2,
        plannedServings: 4,
        ingredients: [
          {
            ingredientId: "i1",
            name: "Spaghetti",
            quantity: 200,
            unit: "g",
            notes: "",
            storeSection: "",
          },
        ],
      },
    ]);
    expect(inputs[0]?.quantity).toBe(400);
  });
});

describe("createManualItemInputSchema", () => {
  it("requires a name", () => {
    const result = createManualItemInputSchema.safeParse({
      listId: "11111111-1111-4111-8111-111111111111",
      name: " ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid manual item", () => {
    const result = createManualItemInputSchema.safeParse({
      listId: "11111111-1111-4111-8111-111111111111",
      name: "Paper towels",
      quantity: 2,
      unit: "package",
      storeSection: "",
      notes: "",
    });
    expect(result.success).toBe(true);
  });
});
