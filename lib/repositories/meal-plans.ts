import "server-only";

import {
  createPlannedMealInputSchema,
  mapPlannedMeal,
  mealSlotSchema,
  sortPlannedMeals,
  updatePlannedMealInputSchema,
  weekEndOn,
  weekStartOn,
  type CreatePlannedMealInput,
  type PlannedMeal,
  type PlannedMealRow,
  type UpdatePlannedMealInput,
} from "@/lib/domain/meal-plan";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

const MEAL_COLUMNS =
  "id, household_id, plan_date, meal_slot, recipe_id, custom_title, servings, notes, sort_order, created_at, recipe:recipes(id, name, archived_at)";

class MealPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MealPlanError";
  }
}

function asMealRow(data: unknown): PlannedMealRow {
  return data as PlannedMealRow;
}

async function nextSortOrder(
  householdId: string,
  planDate: string,
  mealSlot: string,
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planned_meals")
    .select("sort_order")
    .eq("household_id", householdId)
    .eq("plan_date", planDate)
    .eq("meal_slot", mealSlot)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new MealPlanError("Unable to place this meal in the day.");
  }

  return (data?.sort_order ?? -1) + 1;
}

async function loadActiveRecipe(
  householdId: string,
  recipeId: string,
): Promise<{ id: string; name: string; servings: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, servings, archived_at, household_id")
    .eq("id", recipeId)
    .eq("household_id", householdId)
    .maybeSingle();

  if (error || !data) {
    throw new MealPlanError("That recipe could not be found.");
  }
  if (data.archived_at) {
    throw new MealPlanError("That recipe is no longer available.");
  }

  return {
    id: data.id,
    name: data.name,
    servings: Number(data.servings),
  };
}

/**
 * Resolve the non-empty display title (snapshot). When a recipe is linked,
 * prefer the live recipe name for the snapshot unless the caller already
 * provided a title (custom override is only for custom-only meals).
 */
async function resolveTitleAndRecipe(
  householdId: string,
  input: {
    recipeId?: string | null;
    title?: string;
  },
): Promise<{
  recipeId: string | null;
  title: string;
  recipeServings: number | null;
}> {
  const recipeId = input.recipeId ?? null;

  if (recipeId) {
    const recipe = await loadActiveRecipe(householdId, recipeId);
    // Always snapshot the current recipe name so the meal stays labeled if the
    // recipe is later archived or hard-deleted (ON DELETE SET NULL).
    return {
      recipeId: recipe.id,
      title: recipe.name,
      recipeServings: recipe.servings,
    };
  }

  const providedTitle = input.title?.trim() ?? "";
  if (!providedTitle) {
    throw new MealPlanError("Choose a recipe or enter a meal name.");
  }

  return { recipeId: null, title: providedTitle, recipeServings: null };
}

export async function listPlannedMealsForWeek(
  weekStart: string,
): Promise<PlannedMeal[]> {
  const membership = await requireCurrentMembership();
  const start = weekStartOn(weekStart);
  const end = weekEndOn(start);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("planned_meals")
    .select(MEAL_COLUMNS)
    .eq("household_id", membership.household.id)
    .gte("plan_date", start)
    .lte("plan_date", end);

  if (error) {
    throw new MealPlanError("Unable to load this week's meals.");
  }

  return sortPlannedMeals(
    (data ?? []).map((row) => mapPlannedMeal(asMealRow(row))),
  );
}

export async function getPlannedMeal(id: string): Promise<PlannedMeal | null> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("planned_meals")
    .select(MEAL_COLUMNS)
    .eq("id", id)
    .eq("household_id", membership.household.id)
    .maybeSingle();

  if (error) {
    throw new MealPlanError("Unable to load that meal.");
  }
  if (!data) {
    return null;
  }

  return mapPlannedMeal(asMealRow(data));
}

export async function createPlannedMeal(
  input: CreatePlannedMealInput,
): Promise<PlannedMeal> {
  const membership = await requireCurrentMembership();
  const parsed = createPlannedMealInputSchema.parse(input);
  mealSlotSchema.parse(parsed.mealSlot);

  const { recipeId, title, recipeServings } = await resolveTitleAndRecipe(
    membership.household.id,
    { recipeId: parsed.recipeId, title: parsed.title },
  );

  const servings =
    parsed.servings !== undefined ? parsed.servings : recipeServings;
  const sortOrder = await nextSortOrder(
    membership.household.id,
    parsed.planDate,
    parsed.mealSlot,
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planned_meals")
    .insert({
      household_id: membership.household.id,
      plan_date: parsed.planDate,
      meal_slot: parsed.mealSlot,
      recipe_id: recipeId,
      custom_title: title,
      servings,
      notes: parsed.notes,
      sort_order: sortOrder,
    })
    .select(MEAL_COLUMNS)
    .single();

  if (error || !data) {
    throw new MealPlanError("Unable to add that meal.");
  }

  return mapPlannedMeal(asMealRow(data));
}

export async function updatePlannedMeal(
  input: UpdatePlannedMealInput,
): Promise<PlannedMeal> {
  const membership = await requireCurrentMembership();
  const parsed = updatePlannedMealInputSchema.parse(input);

  const existing = await getPlannedMeal(parsed.id);
  if (!existing) {
    throw new MealPlanError("That meal could not be found.");
  }

  const { recipeId, title, recipeServings } = await resolveTitleAndRecipe(
    membership.household.id,
    { recipeId: parsed.recipeId, title: parsed.title },
  );

  const servings =
    parsed.servings !== undefined
      ? parsed.servings
      : (existing.servings ?? recipeServings);

  const dateOrSlotChanged =
    parsed.planDate !== existing.planDate ||
    parsed.mealSlot !== existing.mealSlot;

  const sortOrder = dateOrSlotChanged
    ? await nextSortOrder(
        membership.household.id,
        parsed.planDate,
        parsed.mealSlot,
      )
    : existing.sortOrder;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planned_meals")
    .update({
      plan_date: parsed.planDate,
      meal_slot: parsed.mealSlot,
      recipe_id: recipeId,
      custom_title: title,
      servings,
      notes: parsed.notes,
      sort_order: sortOrder,
    })
    .eq("id", parsed.id)
    .eq("household_id", membership.household.id)
    .select(MEAL_COLUMNS)
    .single();

  if (error || !data) {
    throw new MealPlanError("Unable to update that meal.");
  }

  return mapPlannedMeal(asMealRow(data));
}

export async function deletePlannedMeal(id: string): Promise<void> {
  const membership = await requireCurrentMembership();
  const existing = await getPlannedMeal(id);
  if (!existing) {
    throw new MealPlanError("That meal could not be found.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planned_meals")
    .delete()
    .eq("id", id)
    .eq("household_id", membership.household.id);

  if (error) {
    throw new MealPlanError("Unable to remove that meal.");
  }
}
