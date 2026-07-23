import "server-only";

import {
  createRecipeInputSchema,
  imageExtensionForType,
  mapRecipe,
  mapRecipeIngredient,
  recipeSortSchema,
  sortRecipeIngredients,
  updateRecipeInputSchema,
  type CreateRecipeInput,
  type RecipeDetail,
  type RecipeIngredientRow,
  type RecipeSort,
  type RecipeSummary,
  type UpdateRecipeInput,
} from "@/lib/domain/recipe";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

const RECIPE_COLUMNS =
  "id, household_id, name, servings, prep_time_minutes, cook_time_minutes, instructions, notes, image_path, archived_at";

const RECIPE_INGREDIENT_COLUMNS =
  "id, recipe_id, ingredient_id, quantity, unit, notes, sort_order, ingredient:ingredients(name)";

const RECIPE_IMAGE_BUCKET = "recipe-images";

/** Signed-URL lifetime for recipe images (seconds). Regenerated per render. */
const RECIPE_IMAGE_URL_TTL = 60 * 60;

/**
 * Resolve short-lived signed URLs for a set of image object keys. Missing or
 * failed keys map to null; callers treat that as "no image".
 */
async function signRecipeImageUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) {
    return urls;
  }

  const { data } = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .createSignedUrls(paths, RECIPE_IMAGE_URL_TTL);

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl && !entry.error) {
      urls.set(entry.path, entry.signedUrl);
    }
  }

  return urls;
}

/**
 * Signed cover URLs for specific recipe ids (Dashboard meal thumbnails).
 * Avoids loading and signing the full recipe catalog.
 */
export async function listRecipeCoverUrlsByIds(
  recipeIds: string[],
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(recipeIds.filter(Boolean))];
  const result = new Map<string, string | null>();
  if (uniqueIds.length === 0) {
    return result;
  }

  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, image_path")
    .eq("household_id", membership.household.id)
    .is("archived_at", null)
    .in("id", uniqueIds);

  if (error) {
    throw new Error("Unable to load recipe images.");
  }

  const rows = data ?? [];
  const paths = rows
    .map((row) => row.image_path)
    .filter((path): path is string => !!path);
  const urls = await signRecipeImageUrls(supabase, paths);

  for (const id of uniqueIds) {
    result.set(id, null);
  }
  for (const row of rows) {
    result.set(
      row.id,
      row.image_path ? (urls.get(row.image_path) ?? null) : null,
    );
  }

  return result;
}

export type ListRecipesOptions = {
  search?: string;
  sort?: RecipeSort;
  /** Cap rows returned (e.g. Dashboard recent recipes). */
  limit?: number;
  /**
   * Skip Storage signed URLs. Dashboard summaries use names only — signing
   * every household recipe image is unnecessary.
   */
  skipImages?: boolean;
};

/**
 * Active (non-archived) recipe summaries for the household. Search matches the
 * recipe name (case-insensitive). Ingredient-name search is deferred.
 */
export async function listRecipes(
  options: ListRecipesOptions = {},
): Promise<RecipeSummary[]> {
  const membership = await requireCurrentMembership();
  const sort = recipeSortSchema.parse(options.sort ?? "name");
  const search = options.search?.trim() ?? "";
  const skipImages = options.skipImages === true;
  const limit =
    typeof options.limit === "number" &&
    Number.isFinite(options.limit) &&
    options.limit > 0
      ? Math.floor(options.limit)
      : undefined;
  const supabase = await createClient();

  let query = supabase
    .from("recipes")
    .select(
      "id, name, servings, prep_time_minutes, cook_time_minutes, image_path, recipe_ingredients(count)",
    )
    .eq("household_id", membership.household.id)
    .is("archived_at", null);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  query =
    sort === "recent"
      ? query.order("updated_at", { ascending: false })
      : query.order("name", { ascending: true });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Unable to load recipes.");
  }

  const rows = data ?? [];
  const imageUrls = skipImages
    ? new Map<string, string>()
    : await signRecipeImageUrls(
        supabase,
        rows
          .map((row) => row.image_path)
          .filter((path): path is string => !!path),
      );

  return rows.map((row) => {
    const counts = row.recipe_ingredients as { count: number }[] | null;
    return {
      id: row.id,
      name: row.name,
      servings: row.servings,
      prepTimeMinutes: row.prep_time_minutes,
      cookTimeMinutes: row.cook_time_minutes,
      ingredientCount: counts?.[0]?.count ?? 0,
      imagePath: row.image_path,
      imageUrl:
        skipImages || !row.image_path
          ? null
          : (imageUrls.get(row.image_path) ?? null),
    } satisfies RecipeSummary;
  });
}

/** A single active recipe with its ordered ingredient lines, or null. */
export async function getRecipe(id: string): Promise<RecipeDetail | null> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      `${RECIPE_COLUMNS}, recipe_ingredients(${RECIPE_INGREDIENT_COLUMNS})`,
    )
    .eq("id", id)
    .eq("household_id", membership.household.id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load recipe.");
  }

  if (!data) {
    return null;
  }

  const recipe = mapRecipe(data);
  const ingredients = sortRecipeIngredients(
    ((data.recipe_ingredients ?? []) as RecipeIngredientRow[]).map(
      mapRecipeIngredient,
    ),
  );

  let imageUrl: string | null = null;
  if (recipe.imagePath) {
    const urls = await signRecipeImageUrls(supabase, [recipe.imagePath]);
    imageUrl = urls.get(recipe.imagePath) ?? null;
  }

  return { ...recipe, ingredients, imageUrl };
}

function ingredientPayload(input: CreateRecipeInput) {
  return input.ingredients.map((line) => ({
    name: line.name,
    quantity: line.quantity,
    unit: line.unit,
    notes: line.notes,
  }));
}

/** Create a recipe and its ingredients atomically via the save RPC. */
export async function createRecipe(input: CreateRecipeInput): Promise<string> {
  const membership = await requireCurrentMembership();
  const parsed = createRecipeInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("save_recipe_with_ingredients", {
    p_household_id: membership.household.id,
    p_name: parsed.name,
    p_servings: parsed.servings,
    // Generated types can't express nullable function params; NULL is valid at
    // runtime and means "no time given".
    p_prep_time_minutes: parsed.prepTimeMinutes as number,
    p_cook_time_minutes: parsed.cookTimeMinutes as number,
    p_instructions: parsed.instructions,
    p_notes: parsed.notes,
    p_ingredients: ingredientPayload(parsed),
  });

  if (error || !data) {
    throw new Error("Unable to save recipe.");
  }

  return data;
}

/** Update a recipe and rewrite its ingredient lines atomically. */
export async function updateRecipe(input: UpdateRecipeInput): Promise<string> {
  const membership = await requireCurrentMembership();
  const parsed = updateRecipeInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("save_recipe_with_ingredients", {
    p_household_id: membership.household.id,
    p_name: parsed.name,
    p_servings: parsed.servings,
    // See createRecipe: NULL minutes are valid at runtime.
    p_prep_time_minutes: parsed.prepTimeMinutes as number,
    p_cook_time_minutes: parsed.cookTimeMinutes as number,
    p_instructions: parsed.instructions,
    p_notes: parsed.notes,
    p_ingredients: ingredientPayload(parsed),
    p_recipe_id: parsed.id,
  });

  if (error || !data) {
    throw new Error("Unable to save recipe.");
  }

  return data;
}

export type IngredientSuggestion = {
  name: string;
  defaultUnit: string;
};

/** Existing ingredient names/units for reuse suggestions in the form. */
export async function listIngredientSuggestions(): Promise<
  IngredientSuggestion[]
> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ingredients")
    .select("name, default_unit")
    .eq("household_id", membership.household.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Unable to load ingredients.");
  }

  return (data ?? []).map((row) => ({
    name: row.name,
    defaultUnit: row.default_unit,
  }));
}

/** Soft-delete a recipe by archiving it. */
export async function archiveRecipe(id: string): Promise<void> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .update({ archived_at: new Date().toISOString() })
    .eq("household_id", membership.household.id)
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to delete recipe.");
  }

  if (!data) {
    throw new Error("Recipe not found.");
  }
}

/**
 * Upload a cover image to the household folder and return its object key.
 * Storage RLS enforces that the caller belongs to the household.
 */
export async function uploadRecipeImage(file: File): Promise<string> {
  const membership = await requireCurrentMembership();
  const extension = imageExtensionForType(file.type);
  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const supabase = await createClient();
  const path = `${membership.household.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error("Unable to upload image.");
  }

  return path;
}

/** Best-effort removal of a stored recipe image. Never throws. */
export async function deleteRecipeImage(path: string): Promise<void> {
  if (!path) {
    return;
  }
  try {
    const supabase = await createClient();
    await supabase.storage.from(RECIPE_IMAGE_BUCKET).remove([path]);
  } catch {
    // Orphaned objects are harmless; do not fail the surrounding action.
  }
}

/** Point a recipe at a new image object key (or clear it). */
export async function setRecipeImagePath(
  recipeId: string,
  path: string | null,
): Promise<void> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .update({ image_path: path })
    .eq("household_id", membership.household.id)
    .eq("id", recipeId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Unable to update recipe image.");
  }
}
