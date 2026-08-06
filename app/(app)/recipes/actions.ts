"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { revalidateModuleAndDashboard } from "@/lib/dashboard/revalidate";
import { isConcurrencyConflictError } from "@/lib/domain/concurrency";
import {
  archiveRecipeInputSchema,
  createRecipeInputSchema,
  parseOptionalMinutes,
  parseQuantityInput,
  parseServingsInput,
  updateRecipeInputSchema,
  validateRecipeImage,
  type CreateRecipeInput,
} from "@/lib/domain/recipe";
import {
  archiveRecipe,
  createRecipe,
  deleteRecipeImage,
  getRecipe,
  updateRecipe,
  uploadRecipeImage,
} from "@/lib/repositories/recipes";

export type RecipeActionState = {
  error: string | null;
  success: string | null;
  recipeId: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** The selected cover image, or null when the field is empty. */
function imageFile(formData: FormData): File | null {
  const value = formData.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}

const rawLineSchema = z.object({
  name: z.string().default(""),
  quantity: z.string().default(""),
  unit: z.string().default(""),
  notes: z.string().default(""),
});

const rawStepSchema = z.object({
  id: z.uuid(),
  instruction: z.string().default(""),
});

type ParsedForm =
  | { success: true; data: CreateRecipeInput }
  | { success: false; error: string };

function parseRecipeForm(formData: FormData): ParsedForm {
  let servings: number;
  try {
    servings = parseServingsInput(formString(formData, "servings"));
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Enter valid servings.",
    };
  }

  let prepTimeMinutes: number | null;
  let cookTimeMinutes: number | null;
  try {
    prepTimeMinutes = parseOptionalMinutes(formString(formData, "prepTime"));
    cookTimeMinutes = parseOptionalMinutes(formString(formData, "cookTime"));
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Enter times as minutes.",
    };
  }

  let rawLines: unknown;
  try {
    rawLines = JSON.parse(formString(formData, "ingredients") || "[]");
  } catch {
    return { success: false, error: "Ingredient list could not be read." };
  }

  const linesParsed = z.array(rawLineSchema).safeParse(rawLines);
  if (!linesParsed.success) {
    return { success: false, error: "Ingredient list could not be read." };
  }

  const ingredients: CreateRecipeInput["ingredients"] = [];
  for (const line of linesParsed.data) {
    if (!line.name.trim()) {
      continue;
    }
    let quantity: number | null;
    try {
      quantity = parseQuantityInput(line.quantity);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `${line.name.trim()}: ${error.message}`
            : "Enter a valid quantity.",
      };
    }
    ingredients.push({
      name: line.name,
      quantity,
      unit: line.unit,
      notes: line.notes,
    });
  }

  let rawSteps: unknown;
  try {
    rawSteps = JSON.parse(formString(formData, "steps") || "[]");
  } catch {
    return { success: false, error: "Instruction steps could not be read." };
  }

  const stepsParsed = z.array(rawStepSchema).safeParse(rawSteps);
  if (!stepsParsed.success) {
    return { success: false, error: "Instruction steps could not be read." };
  }

  const steps = stepsParsed.data.filter((step) => step.instruction.trim());

  return {
    success: true,
    data: {
      name: formString(formData, "name"),
      servings,
      prepTimeMinutes,
      cookTimeMinutes,
      notes: formString(formData, "notes"),
      ingredients,
      steps,
    },
  };
}

export async function createRecipeAction(
  _previous: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const formParsed = parseRecipeForm(formData);
  if (!formParsed.success) {
    return { error: formParsed.error, success: null, recipeId: null };
  }

  const parsed = createRecipeInputSchema.safeParse(formParsed.data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to save recipe.",
      success: null,
      recipeId: null,
    };
  }

  const image = imageFile(formData);
  if (image) {
    const check = validateRecipeImage({ type: image.type, size: image.size });
    if (!check.ok) {
      return { error: check.error, success: null, recipeId: null };
    }
  }

  // Upload before creating the recipe so an image failure aborts cleanly.
  let uploadedPath: string | null = null;
  if (image) {
    try {
      uploadedPath = await uploadRecipeImage(image);
    } catch {
      return {
        error: "Unable to upload image.",
        success: null,
        recipeId: null,
      };
    }
  }

  let recipeId: string;
  try {
    recipeId = await createRecipe(parsed.data, uploadedPath);
  } catch {
    if (uploadedPath) {
      await deleteRecipeImage(uploadedPath);
    }
    return { error: "Unable to save recipe.", success: null, recipeId: null };
  }

  revalidateModuleAndDashboard("/recipes");
  return { error: null, success: "Recipe added.", recipeId };
}

export async function updateRecipeAction(
  _previous: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const formParsed = parseRecipeForm(formData);
  if (!formParsed.success) {
    return { error: formParsed.error, success: null, recipeId: null };
  }

  const parsed = updateRecipeInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
    ...formParsed.data,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to save recipe.",
      success: null,
      recipeId: null,
    };
  }

  const image = imageFile(formData);
  const removeImage = formString(formData, "removeImage") === "on";
  if (image) {
    const check = validateRecipeImage({ type: image.type, size: image.size });
    if (!check.ok) {
      return { error: check.error, success: null, recipeId: null };
    }
  }

  const existing = await getRecipe(parsed.data.id);
  const oldPath = existing?.imagePath ?? null;

  let uploadedPath: string | null = null;
  if (image) {
    try {
      uploadedPath = await uploadRecipeImage(image);
    } catch {
      return {
        error: "Unable to upload image.",
        success: null,
        recipeId: null,
      };
    }
  }

  const desiredPath = uploadedPath ?? (removeImage ? null : oldPath);
  let recipeId: string;
  try {
    recipeId = await updateRecipe(parsed.data, desiredPath);
  } catch (error) {
    if (uploadedPath) {
      await deleteRecipeImage(uploadedPath);
    }
    if (isConcurrencyConflictError(error)) {
      return { error: error.message, success: null, recipeId: null };
    }
    return { error: "Unable to save recipe.", success: null, recipeId: null };
  }

  if (oldPath && oldPath !== desiredPath) {
    await deleteRecipeImage(oldPath);
  }

  revalidateModuleAndDashboard("/recipes", `/recipes/${parsed.data.id}`);
  return { error: null, success: "Recipe updated.", recipeId };
}

export async function deleteRecipeAction(
  _previous: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const parsed = archiveRecipeInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Recipe not found.",
      success: null,
      recipeId: null,
    };
  }

  try {
    await archiveRecipe(parsed.data);
  } catch (error) {
    if (isConcurrencyConflictError(error)) {
      return { error: error.message, success: null, recipeId: null };
    }
    return { error: "Unable to delete recipe.", success: null, recipeId: null };
  }

  // Redirect server-side: the caller lives on /recipes/[id], which 404s once the
  // recipe is archived. Navigating here avoids that dead route and any client
  // race where the dialog unmounts before it can push.
  revalidateModuleAndDashboard("/recipes");
  redirect("/recipes");
}
