import "server-only";

import { ConcurrencyConflictError } from "@/lib/domain/concurrency";
import { weekEndOn, weekStartOn } from "@/lib/domain/meal-plan";
import {
  aggregateGroceryLines,
  buildAggregationInputsFromMeals,
  createManualItemInputSchema,
  deleteGroceryItemInputSchema,
  mapGroceryList,
  mapGroceryListItem,
  setItemCheckedInputSchema,
  shoppingListNameForWeek,
  sortGroceryItems,
  toRegeneratePayloadItem,
  updateGroceryItemInputSchema,
  type CreateManualItemInput,
  type DeleteGroceryItemInput,
  type GroceryList,
  type GroceryListItem,
  type GroceryListItemRow,
  type GroceryListRow,
  type MealIngredientSource,
  type SetItemCheckedInput,
  type UpdateGroceryItemInput,
} from "@/lib/domain/shopping";
import { requireCurrentMembership } from "@/lib/repositories/households";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const LIST_COLUMNS = "id, household_id, name, week_start_on, status";
const ITEM_COLUMNS =
  "id, household_id, list_id, name, quantity, unit, store_section, is_checked, source, ingredient_id, recipe_id, notes, generation_key, sort_order, updated_at";

class ShoppingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShoppingError";
  }
}

function asListRow(data: unknown): GroceryListRow {
  return data as GroceryListRow;
}

function asItemRow(data: unknown): GroceryListItemRow {
  return data as GroceryListItemRow;
}

export type GenerateGroceryResult = {
  list: GroceryList;
  items: GroceryListItem[];
  skippedCustomMeals: number;
  generatedCount: number;
};

export async function getGroceryListForWeek(
  weekStart: string,
): Promise<GroceryList | null> {
  const membership = await requireCurrentMembership();
  const start = weekStartOn(weekStart);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grocery_lists")
    .select(LIST_COLUMNS)
    .eq("household_id", membership.household.id)
    .eq("week_start_on", start)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new ShoppingError("Unable to load this week's shopping list.");
  }
  if (!data) {
    return null;
  }
  return mapGroceryList(asListRow(data));
}

export async function getOrCreateGroceryListForWeek(
  weekStart: string,
): Promise<GroceryList> {
  const existing = await getGroceryListForWeek(weekStart);
  if (existing) {
    return existing;
  }

  const membership = await requireCurrentMembership();
  const start = weekStartOn(weekStart);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grocery_lists")
    .insert({
      household_id: membership.household.id,
      name: shoppingListNameForWeek(start),
      week_start_on: start,
      status: "active",
    })
    .select(LIST_COLUMNS)
    .single();

  if (error) {
    // Race: another request created the list — re-read.
    const raced = await getGroceryListForWeek(start);
    if (raced) {
      return raced;
    }
    throw new ShoppingError("Unable to start this week's shopping list.");
  }

  return mapGroceryList(asListRow(data));
}

export async function listGroceryItems(
  listId: string,
): Promise<GroceryListItem[]> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grocery_list_items")
    .select(ITEM_COLUMNS)
    .eq("household_id", membership.household.id)
    .eq("list_id", listId);

  if (error) {
    throw new ShoppingError("Unable to load shopping items.");
  }

  return sortGroceryItems(
    (data ?? []).map((row) => mapGroceryListItem(asItemRow(row))),
  );
}

async function loadMealIngredientSources(
  householdId: string,
  weekStart: string,
): Promise<{ sources: MealIngredientSource[]; skippedCustomMeals: number }> {
  const start = weekStartOn(weekStart);
  const end = weekEndOn(start);
  const supabase = await createClient();

  const { data: meals, error: mealsError } = await supabase
    .from("planned_meals")
    .select("id, recipe_id, servings")
    .eq("household_id", householdId)
    .gte("plan_date", start)
    .lte("plan_date", end);

  if (mealsError) {
    throw new ShoppingError("Unable to load meals for this week.");
  }

  const rows = meals ?? [];
  const skippedCustomMeals = rows.filter((meal) => !meal.recipe_id).length;
  const withRecipes = rows.filter(
    (meal): meal is typeof meal & { recipe_id: string } =>
      typeof meal.recipe_id === "string",
  );

  if (withRecipes.length === 0) {
    return { sources: [], skippedCustomMeals };
  }

  const recipeIds = [...new Set(withRecipes.map((meal) => meal.recipe_id))];

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select(
      "id, servings, recipe_ingredients(ingredient_id, quantity, unit, notes, ingredient:ingredients(id, name, store_section))",
    )
    .eq("household_id", householdId)
    .in("id", recipeIds);

  if (recipesError) {
    throw new ShoppingError("Unable to load recipe ingredients.");
  }

  type IngredientJoin = {
    ingredient_id: string;
    quantity: number | null;
    unit: string;
    notes: string;
    ingredient:
      | { id: string; name: string; store_section: string }
      | { id: string; name: string; store_section: string }[]
      | null;
  };

  const recipeMap = new Map<
    string,
    { servings: number; lines: IngredientJoin[] }
  >();

  for (const recipe of recipes ?? []) {
    const lines = (recipe.recipe_ingredients ?? []) as IngredientJoin[];
    recipeMap.set(recipe.id, {
      servings: Number(recipe.servings),
      lines,
    });
  }

  const sources: MealIngredientSource[] = [];
  for (const meal of withRecipes) {
    const recipe = recipeMap.get(meal.recipe_id);
    if (!recipe) {
      continue;
    }
    sources.push({
      recipeId: meal.recipe_id,
      recipeServings: recipe.servings,
      plannedServings:
        meal.servings === null || meal.servings === undefined
          ? null
          : Number(meal.servings),
      ingredients: recipe.lines.map((line) => {
        const ingredient = Array.isArray(line.ingredient)
          ? (line.ingredient[0] ?? null)
          : line.ingredient;
        return {
          ingredientId: line.ingredient_id,
          name: ingredient?.name ?? "Ingredient",
          quantity:
            line.quantity === null || line.quantity === undefined
              ? null
              : Number(line.quantity),
          unit: line.unit,
          notes: line.notes,
          storeSection: ingredient?.store_section ?? "",
        };
      }),
    });
  }

  return { sources, skippedCustomMeals };
}

export async function generateGroceryListFromMeals(
  weekStart: string,
): Promise<GenerateGroceryResult> {
  const membership = await requireCurrentMembership();
  const start = weekStartOn(weekStart);
  const supabase = await createClient();

  const { sources, skippedCustomMeals } = await loadMealIngredientSources(
    membership.household.id,
    start,
  );

  const aggregated = aggregateGroceryLines(
    buildAggregationInputsFromMeals(sources),
  );

  const payload = aggregated.map(toRegeneratePayloadItem) as Json;

  const { data: listId, error } = await supabase.rpc(
    "regenerate_grocery_list",
    {
      p_household_id: membership.household.id,
      p_week_start_on: start,
      p_items: payload,
      p_list_name: shoppingListNameForWeek(start),
    },
  );

  if (error || !listId) {
    throw new ShoppingError(
      "Unable to update the shopping list from this week's meals.",
    );
  }

  const list = await getGroceryListForWeek(start);
  if (!list) {
    throw new ShoppingError(
      "Shopping list was created but could not be loaded.",
    );
  }

  const items = await listGroceryItems(list.id);
  return {
    list,
    items,
    skippedCustomMeals,
    generatedCount: aggregated.length,
  };
}

export async function createManualItem(
  input: CreateManualItemInput,
): Promise<GroceryListItem> {
  const membership = await requireCurrentMembership();
  const parsed = createManualItemInputSchema.parse(input);
  const supabase = await createClient();

  let listId = parsed.listId;
  if (!listId) {
    if (!parsed.weekStart) {
      throw new ShoppingError("That shopping list could not be found.");
    }
    const list = await getOrCreateGroceryListForWeek(parsed.weekStart);
    listId = list.id;
  } else {
    const { data: list, error: listError } = await supabase
      .from("grocery_lists")
      .select("id")
      .eq("id", listId)
      .eq("household_id", membership.household.id)
      .maybeSingle();

    if (listError || !list) {
      throw new ShoppingError("That shopping list could not be found.");
    }
  }

  const { data: maxRow } = await supabase
    .from("grocery_list_items")
    .select("sort_order")
    .eq("list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("grocery_list_items")
    .insert({
      household_id: membership.household.id,
      list_id: listId,
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      store_section: parsed.storeSection,
      notes: parsed.notes,
      source: "manual",
      generation_key: null,
      is_checked: false,
      sort_order: sortOrder,
    })
    .select(ITEM_COLUMNS)
    .single();

  if (error || !data) {
    throw new ShoppingError("Unable to add that item.");
  }

  return mapGroceryListItem(asItemRow(data));
}

export async function updateGroceryItem(
  input: UpdateGroceryItemInput,
): Promise<GroceryListItem> {
  const membership = await requireCurrentMembership();
  const parsed = updateGroceryItemInputSchema.parse(input);
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("grocery_list_items")
    .select(ITEM_COLUMNS)
    .eq("id", parsed.id)
    .eq("household_id", membership.household.id)
    .maybeSingle();

  if (loadError || !existing) {
    throw new ShoppingError("That item could not be found.");
  }

  if (existing.source !== "manual") {
    throw new ShoppingError("Only manually added items can be edited.");
  }

  const { data, error } = await supabase
    .from("grocery_list_items")
    .update({
      name: parsed.name ?? existing.name,
      quantity:
        parsed.quantity !== undefined ? parsed.quantity : existing.quantity,
      unit: parsed.unit ?? existing.unit,
      store_section:
        parsed.storeSection !== undefined
          ? parsed.storeSection
          : existing.store_section,
      notes: parsed.notes !== undefined ? parsed.notes : existing.notes,
    })
    .eq("id", parsed.id)
    .eq("household_id", membership.household.id)
    .eq("source", "manual")
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select(ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new ShoppingError("Unable to update that item.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }

  return mapGroceryListItem(asItemRow(data));
}

export async function setItemChecked(
  input: SetItemCheckedInput,
): Promise<GroceryListItem> {
  const membership = await requireCurrentMembership();
  const parsed = setItemCheckedInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grocery_list_items")
    .update({ is_checked: parsed.isChecked })
    .eq("id", parsed.id)
    .eq("household_id", membership.household.id)
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select(ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new ShoppingError("Unable to update that item.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }

  return mapGroceryListItem(asItemRow(data));
}

export async function deleteGroceryItem(
  input: DeleteGroceryItemInput,
): Promise<void> {
  const membership = await requireCurrentMembership();
  const parsed = deleteGroceryItemInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grocery_list_items")
    .delete()
    .eq("id", parsed.id)
    .eq("household_id", membership.household.id)
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ShoppingError("Unable to remove that item.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }
}

export async function clearCheckedItems(listId: string): Promise<number> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grocery_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("household_id", membership.household.id)
    .eq("is_checked", true)
    .select("id");

  if (error) {
    throw new ShoppingError("Unable to clear checked items.");
  }

  return data?.length ?? 0;
}
