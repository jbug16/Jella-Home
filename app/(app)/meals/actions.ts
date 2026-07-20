"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createPlannedMealInputSchema,
  createPlannedMealsInputSchema,
  mealSlotSchema,
  parseOptionalServingsInput,
  updatePlannedMealInputSchema,
} from "@/lib/domain/meal-plan";
import { isoDateSchema } from "@/lib/domain/dates";
import {
  createPlannedMeal,
  deletePlannedMeal,
  updatePlannedMeal,
} from "@/lib/repositories/meal-plans";

export type MealActionState = {
  error: string | null;
  success: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formOptionalUuid(formData: FormData, key: string): string | null {
  const raw = formString(formData, key).trim();
  if (!raw) {
    return null;
  }
  const parsed = z.uuid().safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function actionError(error: unknown, fallback: string): MealActionState {
  if (error instanceof z.ZodError) {
    return { error: firstZodMessage(error), success: null };
  }
  if (error instanceof Error && error.message) {
    return { error: error.message, success: null };
  }
  return { error: fallback, success: null };
}

export async function createPlannedMealAction(
  _prev: MealActionState,
  formData: FormData,
): Promise<MealActionState> {
  try {
    let servings: number | null | undefined;
    try {
      servings = parseOptionalServingsInput(formString(formData, "servings"));
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Enter servings as a positive number.",
        success: null,
      };
    }

    const mode = formString(formData, "mode"); // "recipe" | "custom"
    const recipeId =
      mode === "custom" ? null : formOptionalUuid(formData, "recipeId");
    const title = mode === "custom" ? formString(formData, "title") : undefined;
    const planDates = formData
      .getAll("planDates")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    // Prefer multi-day payload; fall back to single planDate for edit-adjacent flows.
    if (planDates.length > 0) {
      const batch = createPlannedMealsInputSchema.parse({
        planDates,
        mealSlot: mealSlotSchema.parse(formString(formData, "mealSlot")),
        recipeId,
        title,
        servings,
        notes: formString(formData, "notes"),
      });

      for (const planDate of batch.planDates) {
        await createPlannedMeal(
          createPlannedMealInputSchema.parse({
            planDate,
            mealSlot: batch.mealSlot,
            recipeId: batch.recipeId,
            title: batch.title,
            servings: batch.servings,
            notes: batch.notes,
          }),
        );
      }

      revalidatePath("/meals");
      return {
        error: null,
        success:
          batch.planDates.length === 1
            ? "Meal added."
            : `Meal added to ${batch.planDates.length} days.`,
      };
    }

    const input = createPlannedMealInputSchema.parse({
      planDate: isoDateSchema.parse(formString(formData, "planDate")),
      mealSlot: mealSlotSchema.parse(formString(formData, "mealSlot")),
      recipeId,
      title,
      servings,
      notes: formString(formData, "notes"),
    });

    await createPlannedMeal(input);
    revalidatePath("/meals");
    return { error: null, success: "Meal added." };
  } catch (error) {
    return actionError(error, "Unable to add that meal.");
  }
}

export async function updatePlannedMealAction(
  _prev: MealActionState,
  formData: FormData,
): Promise<MealActionState> {
  try {
    let servings: number | null | undefined;
    try {
      servings = parseOptionalServingsInput(formString(formData, "servings"));
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Enter servings as a positive number.",
        success: null,
      };
    }

    const mode = formString(formData, "mode");
    const recipeId =
      mode === "custom" ? null : formOptionalUuid(formData, "recipeId");
    const title = mode === "custom" ? formString(formData, "title") : undefined;

    const input = updatePlannedMealInputSchema.parse({
      id: z.uuid().parse(formString(formData, "id")),
      planDate: isoDateSchema.parse(formString(formData, "planDate")),
      mealSlot: mealSlotSchema.parse(formString(formData, "mealSlot")),
      recipeId,
      title,
      servings,
      notes: formString(formData, "notes"),
    });

    await updatePlannedMeal(input);
    revalidatePath("/meals");
    return { error: null, success: "Meal updated." };
  } catch (error) {
    return actionError(error, "Unable to update that meal.");
  }
}

export async function deletePlannedMealAction(
  _prev: MealActionState,
  formData: FormData,
): Promise<MealActionState> {
  try {
    const id = z.uuid().parse(formString(formData, "id"));
    await deletePlannedMeal(id);
    revalidatePath("/meals");
    return { error: null, success: "Meal removed." };
  } catch (error) {
    return actionError(error, "Unable to remove that meal.");
  }
}
