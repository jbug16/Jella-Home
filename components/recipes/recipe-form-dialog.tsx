"use client";

import { ImagePlus, Repeat2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  createRecipeAction,
  updateRecipeAction,
  type RecipeActionState,
} from "@/app/(app)/recipes/actions";
import {
  FormError,
  FormScrollBody,
  FormStickyFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import {
  IngredientRows,
  newIngredientRow,
  type IngredientRow,
} from "@/components/recipes/ingredient-rows";
import {
  RecipeStepRows,
  type RecipeStepRow,
} from "@/components/recipes/recipe-step-rows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatQuantity,
  validateRecipeImage,
  type RecipeDetail,
} from "@/lib/domain/recipe";
import type { IngredientSuggestion } from "@/lib/repositories/recipes";

const initialState: RecipeActionState = {
  error: null,
  success: null,
  recipeId: null,
};

type RecipeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: IngredientSuggestion[];
  recipe?: RecipeDetail | null;
};

function initialRows(recipe?: RecipeDetail | null): IngredientRow[] {
  if (recipe && recipe.ingredients.length > 0) {
    return recipe.ingredients.map((line) =>
      newIngredientRow({
        quantity: line.quantity === null ? "" : formatQuantity(line.quantity),
        unit: line.unit,
        name: line.name,
        notes: line.notes,
      }),
    );
  }
  return [newIngredientRow()];
}

function initialSteps(recipe?: RecipeDetail | null): RecipeStepRow[] {
  return (
    recipe?.steps.map(({ id, instruction }) => ({ id, instruction })) ?? []
  );
}

function RecipeForm({
  suggestions,
  recipe,
  onClose,
}: {
  suggestions: IngredientSuggestion[];
  recipe?: RecipeDetail | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(recipe);
  const action = isEdit ? updateRecipeAction : createRecipeAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [rows, setRows] = useState<IngredientRow[]>(() => initialRows(recipe));
  const [steps, setSteps] = useState<RecipeStepRow[]>(() =>
    initialSteps(recipe),
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasExistingImage = Boolean(recipe?.imageUrl);
  const shownImageUrl =
    previewUrl ??
    (hasExistingImage && !removeExisting ? (recipe?.imageUrl ?? null) : null);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function onImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    if (!file) {
      setImageError(null);
      return;
    }
    const check = validateRecipeImage({ type: file.type, size: file.size });
    if (!check.ok) {
      setImageError(check.error);
      event.target.value = "";
      return;
    }
    setImageError(null);
    setRemoveExisting(false);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setImageError(null);
    if (hasExistingImage) {
      setRemoveExisting(true);
    }
  }

  const ingredientsJson = useMemo(
    () =>
      JSON.stringify(
        rows.map((row) => ({
          name: row.name,
          quantity: row.quantity,
          unit: row.unit,
          notes: row.notes,
        })),
      ),
    [rows],
  );
  const stepsJson = useMemo(() => JSON.stringify(steps), [steps]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      {recipe ? (
        <>
          <input type="hidden" name="id" value={recipe.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={recipe.updatedAt}
          />
        </>
      ) : null}
      <input type="hidden" name="ingredients" value={ingredientsJson} />
      <input type="hidden" name="steps" value={stepsJson} />

      <FormScrollBody>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Basic information</h3>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              disabled={pending}
              className="min-h-11"
              placeholder="Weeknight pasta"
              defaultValue={recipe?.name ?? ""}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                name="servings"
                inputMode="decimal"
                required
                disabled={pending}
                className="min-h-11"
                placeholder="2"
                defaultValue={recipe ? formatQuantity(recipe.servings) : "2"}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prepTime">Prep (min)</Label>
              <Input
                id="prepTime"
                name="prepTime"
                inputMode="numeric"
                disabled={pending}
                className="min-h-11"
                placeholder="10"
                defaultValue={recipe?.prepTimeMinutes ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cookTime">Cook (min)</Label>
              <Input
                id="cookTime"
                name="cookTime"
                inputMode="numeric"
                disabled={pending}
                className="min-h-11"
                placeholder="20"
                defaultValue={recipe?.cookTimeMinutes ?? ""}
              />
            </div>
          </div>

          <div className="order-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Image</h3>
            <Label htmlFor="image">Photo</Label>

            {/* The native file input is kept in the form but visually hidden; the
            styled controls below drive it. */}
            <input
              ref={fileInputRef}
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending}
              className="sr-only"
              onChange={onImageChange}
              data-testid="recipe-image-input"
            />
            {removeExisting ? (
              <input type="hidden" name="removeImage" value="on" />
            ) : null}

            {shownImageUrl ? (
              <div className="group relative overflow-hidden rounded-xl border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shownImageUrl}
                  alt={
                    previewUrl
                      ? "Selected recipe photo"
                      : `Current photo for ${recipe?.name ?? "recipe"}`
                  }
                  className="aspect-[16/10] w-full object-cover"
                  data-testid={
                    previewUrl ? "recipe-image-preview" : "recipe-image-current"
                  }
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/55 to-transparent p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Repeat2 className="size-4" aria-hidden="true" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={removePhoto}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-background shadow-sm">
                  <ImagePlus className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  Add a photo
                </span>
                <span className="text-xs">JPEG, PNG, or WebP · up to 5 MB</span>
              </button>
            )}

            {imageError ? (
              <p className="text-sm text-destructive" role="alert">
                {imageError}
              </p>
            ) : null}
          </div>

          <div className="order-2 flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Ingredients</h3>
            <IngredientRows
              rows={rows}
              onChange={setRows}
              suggestions={suggestions}
              disabled={pending}
            />
          </div>

          <section
            className="order-3 space-y-3"
            aria-labelledby="recipe-instructions-heading"
          >
            <div>
              <h3
                id="recipe-instructions-heading"
                className="text-sm font-semibold"
              >
                Instructions
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add steps in the order they should be followed. Instructions are
                optional.
              </p>
            </div>
            <RecipeStepRows
              steps={steps}
              onChange={setSteps}
              disabled={pending}
            />
          </section>

          <div className="order-5 flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Notes</h3>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              disabled={pending}
              placeholder="Serving ideas, substitutions, source…"
              defaultValue={recipe?.notes ?? ""}
            />
          </div>

          <FormError message={state.error} />
        </div>
      </FormScrollBody>

      <FormStickyFooter>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="touch"
            disabled={pending || Boolean(imageError)}
            data-testid={isEdit ? "save-recipe" : "create-recipe-submit"}
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add recipe"}
          </Button>
        </div>
      </FormStickyFooter>
    </form>
  );
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  suggestions,
  recipe,
}: RecipeFormDialogProps) {
  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={recipe ? "Edit recipe" : "Add recipe"}
      desktopWidthClassName="sm:max-w-lg"
    >
      <RecipeForm
        key={open ? (recipe?.id ?? "new") : "closed"}
        suggestions={suggestions}
        recipe={recipe}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveFormShell>
  );
}
