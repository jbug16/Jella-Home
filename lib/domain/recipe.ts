import { z } from "zod";

import { expectedUpdatedAtSchema } from "@/lib/domain/concurrency";
import { toVersionTimestamp } from "@/lib/domain/timestamps";

/** Non-negative whole minutes, or null when unspecified. */
export const optionalMinutesSchema = z
  .number()
  .int("Enter whole minutes.")
  .nonnegative("Time cannot be negative.")
  .nullable();

/** Servings must be a positive number (fractional servings allowed). */
export const servingsSchema = z
  .number()
  .positive("Servings must be greater than zero.");

/** Ingredient quantity: a positive number, or null for "to taste". */
export const optionalQuantitySchema = z
  .number()
  .positive("Quantity must be greater than zero.")
  .nullable();

export type RecipeUnit = { value: string; label: string };
export type RecipeUnitGroup = { label: string; units: RecipeUnit[] };

/**
 * The approved units of measurement, grouped for the picker. Values are the
 * canonical (normalized, lowercase) stored form; labels are shown in the UI.
 * This is the single source of truth for both the form and validation.
 */
export const RECIPE_UNIT_GROUPS: RecipeUnitGroup[] = [
  {
    label: "Volume",
    units: [
      { value: "tsp", label: "Teaspoon (tsp)" },
      { value: "tbsp", label: "Tablespoon (tbsp)" },
      { value: "cup", label: "Cup" },
      { value: "fl oz", label: "Fluid ounce (fl oz)" },
      { value: "ml", label: "Milliliter (ml)" },
      { value: "l", label: "Liter (l)" },
      { value: "pint", label: "Pint" },
      { value: "quart", label: "Quart" },
      { value: "gallon", label: "Gallon" },
    ],
  },
  {
    label: "Weight",
    units: [
      { value: "g", label: "Gram (g)" },
      { value: "kg", label: "Kilogram (kg)" },
      { value: "oz", label: "Ounce (oz)" },
      { value: "lb", label: "Pound (lb)" },
    ],
  },
  {
    label: "Count & other",
    units: [
      { value: "piece", label: "Piece" },
      { value: "clove", label: "Clove" },
      { value: "slice", label: "Slice" },
      { value: "pinch", label: "Pinch" },
      { value: "dash", label: "Dash" },
      { value: "can", label: "Can" },
      { value: "package", label: "Package" },
      { value: "bunch", label: "Bunch" },
    ],
  },
];

/** Flat list of approved canonical unit values (empty string means "no unit"). */
export const APPROVED_UNITS: readonly string[] = RECIPE_UNIT_GROUPS.flatMap(
  (group) => group.units.map((unit) => unit.value),
);

/**
 * True when a unit is allowed: either blank (no unit / a count) or one of the
 * approved units after normalization.
 */
export function isApprovedUnit(raw: string): boolean {
  const normalized = normalizeUnit(raw);
  return normalized === "" || APPROVED_UNITS.includes(normalized);
}

export const recipeSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  name: z.string().trim().min(1, "Recipe name is required."),
  servings: servingsSchema,
  prepTimeMinutes: optionalMinutesSchema,
  cookTimeMinutes: optionalMinutesSchema,
  notes: z.string(),
  imagePath: z.string().nullable(),
  archivedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export type Recipe = z.infer<typeof recipeSchema>;

export const recipeIngredientSchema = z.object({
  id: z.uuid(),
  recipeId: z.uuid(),
  ingredientId: z.uuid(),
  name: z.string(),
  quantity: optionalQuantitySchema,
  unit: z.string(),
  notes: z.string(),
  sortOrder: z.number().int(),
});

export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

export const recipeStepSchema = z.object({
  id: z.uuid(),
  recipeId: z.uuid(),
  instruction: z.string().trim().min(1).max(2_000),
  sortOrder: z.number().int().nonnegative(),
});

export type RecipeStep = z.infer<typeof recipeStepSchema>;

export const recipeWithIngredientsSchema = recipeSchema.extend({
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(recipeStepSchema),
});

export type RecipeWithIngredients = z.infer<typeof recipeWithIngredientsSchema>;

/** A recipe with its ingredients plus a short-lived signed image URL. */
export type RecipeDetail = RecipeWithIngredients & {
  imageUrl: string | null;
};

export type RecipeSummary = {
  id: string;
  name: string;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredientCount: number;
  imagePath: string | null;
  imageUrl: string | null;
};

/** One ingredient line as submitted from the form. */
export const ingredientLineInputSchema = z.object({
  name: z.string().trim().min(1, "Ingredient name is required.").max(120),
  quantity: optionalQuantitySchema,
  unit: z
    .string()
    .default("")
    .transform((value) => normalizeUnit(value))
    .refine((value) => value === "" || APPROVED_UNITS.includes(value), {
      message: "Choose a unit from the list.",
    }),
  notes: z.string().trim().max(200).default(""),
});

export type IngredientLineInput = z.infer<typeof ingredientLineInputSchema>;

export const recipeStepInputSchema = z.object({
  id: z.uuid(),
  instruction: z
    .string()
    .trim()
    .min(1, "Instruction text is required.")
    .max(2_000, "Keep each step under 2,000 characters."),
});

export type RecipeStepInput = z.infer<typeof recipeStepInputSchema>;

export const createRecipeInputSchema = z.object({
  name: z.string().trim().min(1, "Recipe name is required.").max(160),
  servings: servingsSchema,
  prepTimeMinutes: optionalMinutesSchema,
  cookTimeMinutes: optionalMinutesSchema,
  notes: z.string().trim().max(2_000).default(""),
  ingredients: z
    .array(ingredientLineInputSchema)
    .min(1, "Add at least one ingredient.")
    .max(100, "That is too many ingredients."),
  steps: z.array(recipeStepInputSchema).max(100, "That is too many steps."),
});

export type CreateRecipeInput = z.infer<typeof createRecipeInputSchema>;

export const updateRecipeInputSchema = createRecipeInputSchema.extend({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type UpdateRecipeInput = z.infer<typeof updateRecipeInputSchema>;

export const archiveRecipeInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type ArchiveRecipeInput = z.infer<typeof archiveRecipeInputSchema>;

export const recipeSortSchema = z.enum(["name", "recent"]).default("name");

export type RecipeSort = z.infer<typeof recipeSortSchema>;

/**
 * Display form of an ingredient name: trim and collapse internal whitespace
 * while preserving the entered casing.
 */
export function normalizeIngredientName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Case-insensitive comparison key for ingredient identity. Matches the Postgres
 * `ingredients.name_normalized` generated column.
 */
export function ingredientNameKey(raw: string): string {
  return normalizeIngredientName(raw).toLowerCase();
}

/** Trim, lowercase, and collapse whitespace for a unit. */
export function normalizeUnit(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Parse a user-entered quantity into a positive number, or null when blank
 * ("to taste"). Accepts decimals ("1.5"), simple fractions ("1/2"), and mixed
 * numbers ("1 1/2"). Throws on invalid or non-positive input.
 */
export function parseQuantityInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(/\s+/);
  let total = 0;

  for (const part of parts) {
    if (/^\d+(\.\d+)?$/.test(part)) {
      total += Number(part);
      continue;
    }
    const fraction = part.match(/^(\d+)\/(\d+)$/);
    if (fraction) {
      const numerator = Number(fraction[1]);
      const denominator = Number(fraction[2]);
      if (denominator === 0) {
        throw new Error("Enter a valid quantity.");
      }
      total += numerator / denominator;
      continue;
    }
    throw new Error("Enter a valid quantity (e.g. 2, 0.5, or 1 1/2).");
  }

  if (!(total > 0)) {
    throw new Error("Quantity must be greater than zero.");
  }

  return Math.round(total * 1000) / 1000;
}

/** Format a quantity for display; null renders as "to taste". */
export function formatQuantity(quantity: number | null): string {
  if (quantity === null) {
    return "to taste";
  }
  if (Number.isInteger(quantity)) {
    return String(quantity);
  }
  return String(Math.round(quantity * 1000) / 1000);
}

/** Optional-minutes int for a form input string ("" → null). */
export function parseOptionalMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Enter whole minutes.");
  }
  return Number(trimmed);
}

/** Parse a servings string into a positive number. */
export function parseServingsInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter servings as a positive number.");
  }
  const value = Number(trimmed);
  if (!(value > 0)) {
    throw new Error("Servings must be greater than zero.");
  }
  return value;
}

/** Total time (prep + cook). Null only when both are null. */
export function totalTimeMinutes(
  prep: number | null,
  cook: number | null,
): number | null {
  if (prep === null && cook === null) {
    return null;
  }
  return (prep ?? 0) + (cook ?? 0);
}

/** Human-friendly duration: null → null; 45 → "45 min"; 90 → "1 h 30 min". */
export function formatDuration(minutes: number | null): string | null {
  if (minutes === null) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// ---------------------------------------------------------------------------
// Recipe image validation (shared by the server action and unit tests).
// ---------------------------------------------------------------------------

/** Allowed cover-image MIME types mapped to their file extension. */
export const RECIPE_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Maximum accepted cover-image size in bytes (5 MB). */
export const RECIPE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** File extension for an accepted image type, or null if unsupported. */
export function imageExtensionForType(type: string): string | null {
  return RECIPE_IMAGE_TYPES[type] ?? null;
}

export type RecipeImageValidation =
  { ok: true; extension: string } | { ok: false; error: string };

/**
 * Validate a selected cover image by type and size. Returns the resolved file
 * extension when valid, or an actionable message when not.
 */
export function validateRecipeImage(meta: {
  type: string;
  size: number;
}): RecipeImageValidation {
  const extension = imageExtensionForType(meta.type);
  if (!extension) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP image." };
  }
  if (meta.size <= 0) {
    return { ok: false, error: "That image file looks empty." };
  }
  if (meta.size > RECIPE_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }
  return { ok: true, extension };
}

/** Reassign contiguous sort_order values by array position. */
export function reindexSortOrder<T extends { sortOrder: number }>(
  items: T[],
): T[] {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

// ---------------------------------------------------------------------------
// Row → domain mappers (pure; unit-tested to satisfy repository mapping tests).
// ---------------------------------------------------------------------------

export type RecipeRow = {
  id: string;
  household_id: string;
  name: string;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  notes: string;
  image_path: string | null;
  archived_at: string | null;
  updated_at: string;
};

export type RecipeIngredientRow = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number | null;
  unit: string;
  notes: string;
  sort_order: number;
  ingredient: { name: string } | { name: string }[] | null;
};

export type RecipeStepRow = {
  id: string;
  recipe_id: string;
  instruction: string;
  sort_order: number;
};

export function mapRecipe(row: RecipeRow): Recipe {
  return recipeSchema.parse({
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    servings: row.servings,
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    notes: row.notes,
    imagePath: row.image_path,
    archivedAt: row.archived_at,
    updatedAt: toVersionTimestamp(row.updated_at),
  });
}

/** Supabase returns an embedded row as an object or a single-element array. */
function embeddedName(ingredient: RecipeIngredientRow["ingredient"]): string {
  if (!ingredient) {
    return "";
  }
  if (Array.isArray(ingredient)) {
    return ingredient[0]?.name ?? "";
  }
  return ingredient.name;
}

export function mapRecipeIngredient(
  row: RecipeIngredientRow,
): RecipeIngredient {
  return recipeIngredientSchema.parse({
    id: row.id,
    recipeId: row.recipe_id,
    ingredientId: row.ingredient_id,
    name: embeddedName(row.ingredient),
    quantity: row.quantity,
    unit: row.unit,
    notes: row.notes,
    sortOrder: row.sort_order,
  });
}

export function sortRecipeIngredients(
  ingredients: RecipeIngredient[],
): RecipeIngredient[] {
  return [...ingredients].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapRecipeStep(row: RecipeStepRow): RecipeStep {
  return recipeStepSchema.parse({
    id: row.id,
    recipeId: row.recipe_id,
    instruction: row.instruction,
    sortOrder: row.sort_order,
  });
}

export function sortRecipeSteps(steps: RecipeStep[]): RecipeStep[] {
  return [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
}
