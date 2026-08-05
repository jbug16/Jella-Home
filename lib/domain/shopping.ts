import { z } from "zod";

import { expectedUpdatedAtSchema } from "@/lib/domain/concurrency";
import { isoDateSchema } from "@/lib/domain/dates";
import { toVersionTimestamp } from "@/lib/domain/timestamps";
import {
  formatWeekLabel,
  resolveWeekStartParam,
  weekStartOn,
} from "@/lib/domain/meal-plan";
import {
  ingredientNameKey,
  normalizeIngredientName,
  normalizeUnit,
  optionalQuantitySchema,
} from "@/lib/domain/recipe";

export const groceryListStatusSchema = z.enum(["active", "archived"]);

export const groceryItemSourceSchema = z.enum(["manual", "generated"]);

export const groceryListSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  name: z.string(),
  weekStartOn: isoDateSchema.nullable(),
  status: groceryListStatusSchema,
});

export type GroceryList = z.infer<typeof groceryListSchema>;

export const groceryListItemSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  listId: z.uuid(),
  name: z.string(),
  quantity: optionalQuantitySchema,
  unit: z.string(),
  storeSection: z.string(),
  isChecked: z.boolean(),
  source: groceryItemSourceSchema,
  ingredientId: z.uuid().nullable(),
  recipeId: z.uuid().nullable(),
  notes: z.string(),
  generationKey: z.string().nullable(),
  sortOrder: z.number().int(),
  updatedAt: z.string(),
});

export type GroceryListItem = z.infer<typeof groceryListItemSchema>;

export const createManualItemInputSchema = z
  .object({
    listId: z.uuid().optional(),
    weekStart: isoDateSchema.optional(),
    name: z
      .string()
      .trim()
      .min(1, "Enter an item name.")
      .max(160, "That name is too long."),
    quantity: optionalQuantitySchema,
    unit: z
      .string()
      .default("")
      .transform((value) => normalizeUnit(value)),
    storeSection: z.string().trim().max(80).default(""),
    notes: z.string().trim().max(500).default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.listId && !value.weekStart) {
      ctx.addIssue({
        code: "custom",
        message: "Shopping list is missing.",
        path: ["listId"],
      });
    }
  });

export type CreateManualItemInput = z.infer<typeof createManualItemInputSchema>;

export const updateGroceryItemInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
  name: z
    .string()
    .trim()
    .min(1, "Enter an item name.")
    .max(160, "That name is too long.")
    .optional(),
  quantity: optionalQuantitySchema.optional(),
  unit: z
    .string()
    .transform((value) => normalizeUnit(value))
    .optional(),
  storeSection: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type UpdateGroceryItemInput = z.infer<
  typeof updateGroceryItemInputSchema
>;

export const setItemCheckedInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
  isChecked: z.boolean(),
});

export const deleteGroceryItemInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type DeleteGroceryItemInput = z.infer<
  typeof deleteGroceryItemInputSchema
>;

export type SetItemCheckedInput = z.infer<typeof setItemCheckedInputSchema>;

/** One recipe ingredient contribution before aggregation. */
export type GroceryAggregationInput = {
  ingredientId: string | null;
  name: string;
  quantity: number | null;
  unit: string;
  storeSection: string;
  notes: string;
  recipeId: string | null;
};

/** Aggregated generated line ready for the regenerate RPC. */
export type GroceryAggregationOutput = {
  generationKey: string;
  name: string;
  quantity: number | null;
  unit: string;
  storeSection: string;
  notes: string;
  ingredientId: string | null;
  sortOrder: number;
};

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Scale a recipe line by planned servings / recipe servings. */
export function scaleLineQuantity(
  quantity: number | null,
  recipeServings: number,
  plannedServings: number | null,
): number | null {
  if (quantity === null) {
    return null;
  }
  if (!(recipeServings > 0)) {
    return roundQuantity(quantity);
  }
  const planned = plannedServings !== null ? plannedServings : recipeServings;
  if (!(planned > 0)) {
    return roundQuantity(quantity);
  }
  return roundQuantity(quantity * (planned / recipeServings));
}

function noteIdentity(notes: string): string {
  return notes.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Deterministic bucket key for a generated aggregation row.
 * Format: `{ingredientId|n:nameKey}|{unit}|{noteIdentity}`
 */
export function buildGenerationKey(input: {
  ingredientId: string | null;
  name: string;
  unit: string;
  notes: string;
}): string {
  const identity = input.ingredientId
    ? input.ingredientId
    : `n:${ingredientNameKey(input.name)}`;
  const unit = normalizeUnit(input.unit);
  const note = noteIdentity(input.notes);
  return `${identity}|${unit}|${note}`;
}

type MergeBucket = {
  ingredientId: string | null;
  name: string;
  unit: string;
  storeSection: string;
  notes: string;
  quantitySum: number;
  hasNumeric: boolean;
};

/**
 * Aggregate recipe ingredient contributions into generated grocery lines.
 * Buckets share ingredient identity + normalized unit + note identity
 * (identical-note-only merge via generation_key). Different units stay
 * separate. No cross-unit conversion.
 */
export function aggregateGroceryLines(
  inputs: GroceryAggregationInput[],
): GroceryAggregationOutput[] {
  const buckets = new Map<string, MergeBucket>();

  for (const input of inputs) {
    const name = normalizeIngredientName(input.name);
    if (!name) {
      continue;
    }
    const unit = normalizeUnit(input.unit);
    const notes = input.notes.trim().replace(/\s+/g, " ");
    const key = buildGenerationKey({
      ingredientId: input.ingredientId,
      name,
      unit,
      notes,
    });

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        ingredientId: input.ingredientId,
        name,
        unit,
        storeSection: input.storeSection.trim(),
        notes,
        quantitySum: input.quantity ?? 0,
        hasNumeric: input.quantity !== null,
      });
      continue;
    }

    if (input.storeSection.trim() && !existing.storeSection) {
      existing.storeSection = input.storeSection.trim();
    }

    if (input.quantity !== null) {
      existing.quantitySum = roundQuantity(
        existing.quantitySum + input.quantity,
      );
      existing.hasNumeric = true;
    }
  }

  const outputs: GroceryAggregationOutput[] = [];
  for (const [generationKey, bucket] of buckets) {
    outputs.push({
      generationKey,
      name: bucket.name,
      quantity: bucket.hasNumeric ? bucket.quantitySum : null,
      unit: bucket.unit,
      storeSection: bucket.storeSection,
      notes: bucket.notes,
      ingredientId: bucket.ingredientId,
      sortOrder: 0,
    });
  }

  return outputs
    .sort((a, b) => {
      const sectionA = a.storeSection || "\uFFFF";
      const sectionB = b.storeSection || "\uFFFF";
      if (sectionA !== sectionB) {
        return sectionA.localeCompare(sectionB);
      }
      return a.name.localeCompare(b.name);
    })
    .map((line, index) => ({ ...line, sortOrder: index }));
}

export type MealIngredientSource = {
  recipeId: string;
  recipeServings: number;
  plannedServings: number | null;
  ingredients: Array<{
    ingredientId: string;
    name: string;
    quantity: number | null;
    unit: string;
    notes: string;
    storeSection: string;
  }>;
};

/** Build aggregation inputs from planned recipe meals + their ingredient lines. */
export function buildAggregationInputsFromMeals(
  sources: MealIngredientSource[],
): GroceryAggregationInput[] {
  const inputs: GroceryAggregationInput[] = [];
  for (const source of sources) {
    for (const line of source.ingredients) {
      inputs.push({
        ingredientId: line.ingredientId,
        name: line.name,
        quantity: scaleLineQuantity(
          line.quantity,
          source.recipeServings,
          source.plannedServings,
        ),
        unit: line.unit,
        storeSection: line.storeSection,
        notes: line.notes,
        recipeId: source.recipeId,
      });
    }
  }
  return inputs;
}

export function compareGroceryItems(
  a: GroceryListItem,
  b: GroceryListItem,
): number {
  if (a.isChecked !== b.isChecked) {
    return a.isChecked ? 1 : -1;
  }
  const sectionA = a.storeSection || "\uFFFF";
  const sectionB = b.storeSection || "\uFFFF";
  if (sectionA !== sectionB) {
    return sectionA.localeCompare(sectionB);
  }
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  return a.name.localeCompare(b.name);
}

export function sortGroceryItems(items: GroceryListItem[]): GroceryListItem[] {
  return [...items].sort(compareGroceryItems);
}

export type GrocerySection = {
  key: string;
  label: string;
  items: GroceryListItem[];
};

/** Group items for UI: non-empty store_section, else "List". */
export function groupGroceryItems(items: GroceryListItem[]): GrocerySection[] {
  const sorted = sortGroceryItems(items);
  const map = new Map<string, GroceryListItem[]>();
  for (const item of sorted) {
    const key = item.storeSection.trim() ? item.storeSection.trim() : "";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  const sections: GrocerySection[] = [];
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b);
  });
  for (const key of keys) {
    sections.push({
      key: key || "__list__",
      label: key || "List",
      items: map.get(key) ?? [],
    });
  }
  return sections;
}

export function shoppingProgress(items: GroceryListItem[]): {
  checked: number;
  total: number;
} {
  const total = items.length;
  const checked = items.filter((item) => item.isChecked).length;
  return { checked, total };
}

/** Canonical Sunday for shopping week URLs (same as meals). */
export function resolveShoppingWeekStart(
  raw: string | undefined | null,
  now = new Date(),
): string {
  return resolveWeekStartParam(raw, now);
}

export function shoppingListNameForWeek(weekStart: string): string {
  return `Shopping · ${formatWeekLabel(weekStartOn(weekStart))}`;
}

export type GroceryListRow = {
  id: string;
  household_id: string;
  name: string;
  week_start_on: string | null;
  status: string;
};

export type GroceryListItemRow = {
  id: string;
  household_id: string;
  list_id: string;
  name: string;
  quantity: number | null;
  unit: string;
  store_section: string;
  is_checked: boolean;
  source: string;
  ingredient_id: string | null;
  recipe_id: string | null;
  notes: string;
  generation_key: string | null;
  sort_order: number;
  updated_at: string;
};

export function mapGroceryList(row: GroceryListRow): GroceryList {
  return groceryListSchema.parse({
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    weekStartOn: row.week_start_on,
    status: row.status,
  });
}

export function mapGroceryListItem(row: GroceryListItemRow): GroceryListItem {
  return groceryListItemSchema.parse({
    id: row.id,
    householdId: row.household_id,
    listId: row.list_id,
    name: row.name,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    storeSection: row.store_section,
    isChecked: row.is_checked,
    source: row.source,
    ingredientId: row.ingredient_id,
    recipeId: row.recipe_id,
    notes: row.notes,
    generationKey: row.generation_key,
    sortOrder: row.sort_order,
    updatedAt: toVersionTimestamp(row.updated_at),
  });
}

/** Payload element for regenerate_grocery_list RPC. */
export function toRegeneratePayloadItem(line: GroceryAggregationOutput): {
  generation_key: string;
  name: string;
  quantity: string | null;
  unit: string;
  notes: string;
  store_section: string;
  ingredient_id: string | null;
  sort_order: number;
} {
  return {
    generation_key: line.generationKey,
    name: line.name,
    quantity: line.quantity === null ? null : String(line.quantity),
    unit: line.unit,
    notes: line.notes,
    store_section: line.storeSection,
    ingredient_id: line.ingredientId,
    sort_order: line.sortOrder,
  };
}
