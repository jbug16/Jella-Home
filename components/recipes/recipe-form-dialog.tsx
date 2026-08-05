"use client";

import { ImagePlus, Repeat2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  createRecipeAction,
  updateRecipeAction,
  type RecipeActionState,
} from "@/app/(app)/recipes/actions";
import { ResponsiveFormShell } from "@/components/budget/responsive-form-shell";
import {
  IngredientRows,
  newIngredientRow,
  type IngredientRow,
} from "@/components/recipes/ingredient-rows";
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

  return (
    <form action={formAction} className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-2">
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

      <div className="grid grid-cols-3 gap-3">
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

      <div className="flex flex-col gap-2">
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

      <div className="flex flex-col gap-2">
        <Label>Ingredients</Label>
        <IngredientRows
          rows={rows}
          onChange={setRows}
          suggestions={suggestions}
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          disabled={pending}
          className="min-h-32"
          placeholder="Step-by-step method…"
          defaultValue={recipe?.instructions ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          disabled={pending}
          placeholder="Serving ideas, substitutions, source…"
          defaultValue={recipe?.notes ?? ""}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || Boolean(imageError)}
        className="min-h-11 w-full"
        data-testid={isEdit ? "save-recipe" : "create-recipe-submit"}
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add recipe"}
      </Button>
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
