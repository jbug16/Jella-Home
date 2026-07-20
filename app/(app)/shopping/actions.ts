"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isoDateSchema } from "@/lib/domain/dates";
import {
  createManualItemInputSchema,
  resolveShoppingWeekStart,
  setItemCheckedInputSchema,
  updateGroceryItemInputSchema,
} from "@/lib/domain/shopping";
import {
  clearCheckedItems,
  createManualItem,
  deleteGroceryItem,
  generateGroceryListFromMeals,
  setItemChecked,
  updateGroceryItem,
} from "@/lib/repositories/shopping";

export type ShoppingActionState = {
  error: string | null;
  success: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function actionError(error: unknown, fallback: string): ShoppingActionState {
  if (error instanceof z.ZodError) {
    return { error: firstZodMessage(error), success: null };
  }
  if (error instanceof Error && error.message) {
    return { error: error.message, success: null };
  }
  return { error: fallback, success: null };
}

function revalidateShopping() {
  revalidatePath("/shopping");
}

export async function generateGroceryListAction(
  _prev: ShoppingActionState,
  formData: FormData,
): Promise<ShoppingActionState> {
  try {
    const weekRaw = formString(formData, "weekStart");
    const weekStart = resolveShoppingWeekStart(
      isoDateSchema.safeParse(weekRaw).success ? weekRaw : null,
    );
    const result = await generateGroceryListFromMeals(weekStart);
    revalidateShopping();

    if (result.generatedCount === 0 && result.skippedCustomMeals === 0) {
      return {
        error: null,
        success: "No recipe meals this week — add meals or items by hand.",
      };
    }

    const skipNote =
      result.skippedCustomMeals > 0
        ? ` ${result.skippedCustomMeals} meal${result.skippedCustomMeals === 1 ? "" : "s"} without recipes were skipped.`
        : "";

    return {
      error: null,
      success: `Shopping list updated.${skipNote}`,
    };
  } catch (error) {
    return actionError(error, "Unable to update the shopping list.");
  }
}

export async function createManualItemAction(
  _prev: ShoppingActionState,
  formData: FormData,
): Promise<ShoppingActionState> {
  try {
    const quantityRaw = formString(formData, "quantity").trim();
    let quantity: number | null = null;
    if (quantityRaw) {
      const parsed = Number(quantityRaw);
      if (!(parsed > 0)) {
        return {
          error: "Enter a positive quantity, or leave it blank.",
          success: null,
        };
      }
      quantity = parsed;
    }

    const input = createManualItemInputSchema.parse({
      listId: formString(formData, "listId"),
      name: formString(formData, "name"),
      quantity,
      unit: formString(formData, "unit"),
      storeSection: formString(formData, "storeSection"),
      notes: formString(formData, "notes"),
    });

    await createManualItem(input);
    revalidateShopping();
    return { error: null, success: "Item added." };
  } catch (error) {
    return actionError(error, "Unable to add that item.");
  }
}

export async function updateGroceryItemAction(
  _prev: ShoppingActionState,
  formData: FormData,
): Promise<ShoppingActionState> {
  try {
    const quantityRaw = formString(formData, "quantity").trim();
    let quantity: number | null | undefined = undefined;
    if (formData.has("quantity")) {
      if (!quantityRaw) {
        quantity = null;
      } else {
        const parsed = Number(quantityRaw);
        if (!(parsed > 0)) {
          return {
            error: "Enter a positive quantity, or leave it blank.",
            success: null,
          };
        }
        quantity = parsed;
      }
    }

    const input = updateGroceryItemInputSchema.parse({
      id: formString(formData, "id"),
      name: formString(formData, "name") || undefined,
      quantity,
      unit: formData.has("unit") ? formString(formData, "unit") : undefined,
      storeSection: formData.has("storeSection")
        ? formString(formData, "storeSection")
        : undefined,
      notes: formData.has("notes") ? formString(formData, "notes") : undefined,
    });

    await updateGroceryItem(input);
    revalidateShopping();
    return { error: null, success: "Item updated." };
  } catch (error) {
    return actionError(error, "Unable to update that item.");
  }
}

export async function setItemCheckedAction(
  _prev: ShoppingActionState,
  formData: FormData,
): Promise<ShoppingActionState> {
  try {
    const input = setItemCheckedInputSchema.parse({
      id: formString(formData, "id"),
      isChecked: formString(formData, "isChecked") === "true",
    });
    await setItemChecked(input);
    revalidateShopping();
    return { error: null, success: null };
  } catch (error) {
    return actionError(error, "Unable to update that item.");
  }
}

export async function deleteGroceryItemAction(
  _prev: ShoppingActionState,
  formData: FormData,
): Promise<ShoppingActionState> {
  try {
    const id = z.uuid().parse(formString(formData, "id"));
    await deleteGroceryItem(id);
    revalidateShopping();
    return { error: null, success: "Item removed." };
  } catch (error) {
    return actionError(error, "Unable to remove that item.");
  }
}

export async function clearCheckedItemsAction(
  _prev: ShoppingActionState,
  formData: FormData,
): Promise<ShoppingActionState> {
  try {
    const listId = z.uuid().parse(formString(formData, "listId"));
    const count = await clearCheckedItems(listId);
    revalidateShopping();
    return {
      error: null,
      success:
        count === 0
          ? "No checked items to clear."
          : `Cleared ${count} checked item${count === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return actionError(error, "Unable to clear checked items.");
  }
}
