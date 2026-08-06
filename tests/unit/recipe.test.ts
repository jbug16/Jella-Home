import { describe, expect, it } from "vitest";

import {
  APPROVED_UNITS,
  createRecipeInputSchema,
  formatDuration,
  formatQuantity,
  imageExtensionForType,
  ingredientLineInputSchema,
  ingredientNameKey,
  isApprovedUnit,
  mapRecipe,
  mapRecipeIngredient,
  mapRecipeStep,
  normalizeIngredientName,
  normalizeUnit,
  parseOptionalMinutes,
  parseQuantityInput,
  parseServingsInput,
  RECIPE_IMAGE_MAX_BYTES,
  reindexSortOrder,
  sortRecipeIngredients,
  sortRecipeSteps,
  updateRecipeInputSchema,
  validateRecipeImage,
  type RecipeIngredient,
  type RecipeIngredientRow,
  type RecipeRow,
  type RecipeStep,
} from "@/lib/domain/recipe";

describe("normalizeIngredientName", () => {
  it("trims and collapses internal whitespace, preserving case", () => {
    expect(normalizeIngredientName("  Olive   Oil ")).toBe("Olive Oil");
  });
});

describe("ingredientNameKey", () => {
  it("matches the Postgres name_normalized expression", () => {
    expect(ingredientNameKey("  SPAGHETTI  ")).toBe("spaghetti");
    expect(ingredientNameKey("Olive   Oil")).toBe("olive oil");
  });
});

describe("normalizeUnit", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeUnit("  TBSP ")).toBe("tbsp");
    expect(normalizeUnit("fluid   Ounce")).toBe("fluid ounce");
  });
});

describe("parseQuantityInput", () => {
  it("returns null for blank input (to taste)", () => {
    expect(parseQuantityInput("")).toBeNull();
    expect(parseQuantityInput("   ")).toBeNull();
  });

  it("parses integers and decimals", () => {
    expect(parseQuantityInput("2")).toBe(2);
    expect(parseQuantityInput("0.5")).toBe(0.5);
  });

  it("parses simple and mixed fractions", () => {
    expect(parseQuantityInput("1/2")).toBe(0.5);
    expect(parseQuantityInput("1 1/2")).toBe(1.5);
  });

  it("rejects zero, negatives, and garbage", () => {
    expect(() => parseQuantityInput("0")).toThrow();
    expect(() => parseQuantityInput("-1")).toThrow();
    expect(() => parseQuantityInput("abc")).toThrow();
    expect(() => parseQuantityInput("1/0")).toThrow();
  });
});

describe("formatQuantity", () => {
  it("renders null as to taste", () => {
    expect(formatQuantity(null)).toBe("to taste");
  });

  it("renders integers and decimals cleanly", () => {
    expect(formatQuantity(2)).toBe("2");
    expect(formatQuantity(0.5)).toBe("0.5");
  });
});

describe("parseOptionalMinutes", () => {
  it("returns null for blank", () => {
    expect(parseOptionalMinutes("")).toBeNull();
  });

  it("parses whole minutes and rejects non-integers", () => {
    expect(parseOptionalMinutes("45")).toBe(45);
    expect(() => parseOptionalMinutes("4.5")).toThrow();
    expect(() => parseOptionalMinutes("-1")).toThrow();
  });
});

describe("parseServingsInput", () => {
  it("parses positive numbers", () => {
    expect(parseServingsInput("2")).toBe(2);
    expect(parseServingsInput("1.5")).toBe(1.5);
  });

  it("rejects zero and non-numeric", () => {
    expect(() => parseServingsInput("0")).toThrow();
    expect(() => parseServingsInput("many")).toThrow();
  });
});

describe("formatDuration", () => {
  it("renders null when no time is set", () => {
    expect(formatDuration(null)).toBeNull();
  });

  it("renders minutes and hours", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
  });
});

describe("reindexSortOrder", () => {
  it("assigns contiguous sort_order values by position", () => {
    const result = reindexSortOrder([
      { sortOrder: 5 },
      { sortOrder: 2 },
      { sortOrder: 9 },
    ]);
    expect(result.map((r) => r.sortOrder)).toEqual([0, 1, 2]);
  });
});

describe("createRecipeInputSchema", () => {
  const base = {
    name: "Pasta",
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    steps: [
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", instruction: "Boil" },
    ],
    notes: "",
    ingredients: [{ name: "Spaghetti", quantity: 200, unit: "g", notes: "" }],
  };

  it("accepts a valid recipe", () => {
    expect(createRecipeInputSchema.safeParse(base).success).toBe(true);
  });

  it("requires at least one ingredient", () => {
    const result = createRecipeInputSchema.safeParse({
      ...base,
      ingredients: [],
    });
    expect(result.success).toBe(false);
  });

  it("allows null quantity (to taste) and null times", () => {
    const result = createRecipeInputSchema.safeParse({
      ...base,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: [
        { name: "Salt", quantity: null, unit: "", notes: "to taste" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive quantity", () => {
    const result = createRecipeInputSchema.safeParse({
      ...base,
      ingredients: [{ name: "Spaghetti", quantity: 0, unit: "g", notes: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero servings", () => {
    expect(
      createRecipeInputSchema.safeParse({ ...base, servings: 0 }).success,
    ).toBe(false);
  });
});

describe("updateRecipeInputSchema", () => {
  it("requires a uuid id", () => {
    const result = updateRecipeInputSchema.safeParse({
      id: "not-a-uuid",
      name: "Pasta",
      servings: 2,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      notes: "",
      ingredients: [{ name: "Spaghetti", quantity: 1, unit: "g", notes: "" }],
      steps: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("isApprovedUnit", () => {
  it("accepts an empty unit (no unit / count)", () => {
    expect(isApprovedUnit("")).toBe(true);
    expect(isApprovedUnit("   ")).toBe(true);
  });

  it("accepts approved units regardless of case/whitespace", () => {
    expect(isApprovedUnit("tbsp")).toBe(true);
    expect(isApprovedUnit(" TBSP ")).toBe(true);
    expect(isApprovedUnit("Cup")).toBe(true);
  });

  it("rejects units outside the approved list", () => {
    expect(isApprovedUnit("smidge")).toBe(false);
    expect(isApprovedUnit("handful")).toBe(false);
  });
});

describe("ingredientLineInputSchema unit validation", () => {
  it("normalizes an approved unit to canonical form", () => {
    const parsed = ingredientLineInputSchema.parse({
      name: "Flour",
      quantity: 1,
      unit: " TBSP ",
      notes: "",
    });
    expect(parsed.unit).toBe("tbsp");
  });

  it("allows a blank unit", () => {
    const parsed = ingredientLineInputSchema.parse({
      name: "Eggs",
      quantity: 2,
      unit: "",
      notes: "",
    });
    expect(parsed.unit).toBe("");
  });

  it("rejects a unit that is not approved", () => {
    const result = ingredientLineInputSchema.safeParse({
      name: "Flour",
      quantity: 1,
      unit: "handful",
      notes: "",
    });
    expect(result.success).toBe(false);
  });

  it("keeps every approved value valid", () => {
    for (const unit of APPROVED_UNITS) {
      expect(isApprovedUnit(unit)).toBe(true);
    }
  });
});

describe("imageExtensionForType", () => {
  it("maps supported types to extensions", () => {
    expect(imageExtensionForType("image/jpeg")).toBe("jpg");
    expect(imageExtensionForType("image/png")).toBe("png");
    expect(imageExtensionForType("image/webp")).toBe("webp");
  });

  it("returns null for unsupported types", () => {
    expect(imageExtensionForType("image/gif")).toBeNull();
    expect(imageExtensionForType("application/pdf")).toBeNull();
    expect(imageExtensionForType("")).toBeNull();
  });
});

describe("validateRecipeImage", () => {
  it("accepts a valid image and returns the extension", () => {
    const result = validateRecipeImage({ type: "image/png", size: 1024 });
    expect(result).toEqual({ ok: true, extension: "png" });
  });

  it("rejects unsupported types", () => {
    const result = validateRecipeImage({ type: "image/gif", size: 1024 });
    expect(result.ok).toBe(false);
  });

  it("rejects empty files", () => {
    const result = validateRecipeImage({ type: "image/jpeg", size: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects files over the size limit", () => {
    const result = validateRecipeImage({
      type: "image/jpeg",
      size: RECIPE_IMAGE_MAX_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    const result = validateRecipeImage({
      type: "image/webp",
      size: RECIPE_IMAGE_MAX_BYTES,
    });
    expect(result.ok).toBe(true);
  });
});

describe("mapRecipe", () => {
  it("maps a database row to a domain recipe", () => {
    const row: RecipeRow = {
      id: "11111111-1111-4111-8111-111111111111",
      household_id: "22222222-2222-4222-8222-222222222222",
      name: "Pasta",
      servings: 2,
      prep_time_minutes: 10,
      cook_time_minutes: 20,
      notes: "Yum",
      image_path: "22222222-2222-4222-8222-222222222222/cover.jpg",
      archived_at: null,
      updated_at: "2026-07-01T00:00:00.000Z",
    };
    const recipe = mapRecipe(row);
    expect(recipe.prepTimeMinutes).toBe(10);
    expect(recipe.cookTimeMinutes).toBe(20);
    expect(recipe.name).toBe("Pasta");
    expect(recipe.imagePath).toBe(
      "22222222-2222-4222-8222-222222222222/cover.jpg",
    );
  });
});

describe("mapRecipeIngredient", () => {
  const row: RecipeIngredientRow = {
    id: "33333333-3333-4333-8333-333333333333",
    recipe_id: "11111111-1111-4111-8111-111111111111",
    ingredient_id: "44444444-4444-4444-8444-444444444444",
    quantity: null,
    unit: "",
    notes: "to taste",
    sort_order: 0,
    ingredient: { name: "Salt" },
  };

  it("reads an embedded ingredient object", () => {
    expect(mapRecipeIngredient(row).name).toBe("Salt");
    expect(mapRecipeIngredient(row).quantity).toBeNull();
  });

  it("reads an embedded ingredient array (PostgREST shape)", () => {
    const arrayRow = { ...row, ingredient: [{ name: "Pepper" }] };
    expect(mapRecipeIngredient(arrayRow).name).toBe("Pepper");
  });
});

describe("sortRecipeIngredients", () => {
  it("orders by sort_order", () => {
    const ingredients = [
      { sortOrder: 2, name: "b" },
      { sortOrder: 0, name: "a" },
      { sortOrder: 1, name: "c" },
    ] as unknown as RecipeIngredient[];
    expect(sortRecipeIngredients(ingredients).map((i) => i.name)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });
});

describe("recipe steps", () => {
  it("allows recipes with no instructions", () => {
    const parsed = createRecipeInputSchema.safeParse({
      name: "Toast",
      servings: 1,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      notes: "",
      ingredients: [{ name: "Bread", quantity: 1, unit: "slice", notes: "" }],
      steps: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("validates step text and keeps stable ids", () => {
    const result = createRecipeInputSchema.safeParse({
      name: "Toast",
      servings: 1,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      notes: "",
      ingredients: [{ name: "Bread", quantity: 1, unit: "slice", notes: "" }],
      steps: [
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", instruction: "   " },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("maps and orders database step rows", () => {
    const rows = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
        recipe_id: "11111111-1111-4111-8111-111111111111",
        instruction: "Second",
        sort_order: 1,
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        recipe_id: "11111111-1111-4111-8111-111111111111",
        instruction: "First",
        sort_order: 0,
      },
    ];
    const sorted = sortRecipeSteps(rows.map(mapRecipeStep) as RecipeStep[]);
    expect(sorted.map((step) => step.instruction)).toEqual(["First", "Second"]);
  });
});
