"use client";

import { useActionState } from "react";

import {
  deleteRecipeAction,
  type RecipeActionState,
} from "@/app/(app)/recipes/actions";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const initialState: RecipeActionState = {
  error: null,
  success: null,
  recipeId: null,
};

type DeleteRecipeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: { id: string; name: string; updatedAt: string } | null;
};

// On success `deleteRecipeAction` performs a server-side redirect to /recipes.
export function DeleteRecipeDialog({
  open,
  onOpenChange,
  recipe,
}: DeleteRecipeDialogProps) {
  const [state, formAction, pending] = useActionState(
    deleteRecipeAction,
    initialState,
  );

  return (
    <ResponsiveAlertShell
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this recipe?"
      description={
        recipe
          ? `“${recipe.name}” will be removed from your recipes. This cannot be undone.`
          : "This cannot be undone."
      }
    >
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="min-h-11 w-full sm:w-auto sm:min-w-24"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <form action={formAction} className="w-full sm:w-auto">
          <input type="hidden" name="id" value={recipe?.id ?? ""} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={recipe?.updatedAt ?? ""}
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={pending || !recipe}
            className="min-h-11 w-full sm:min-w-24"
            data-testid="confirm-delete-recipe"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </AlertDialogFooter>
    </ResponsiveAlertShell>
  );
}
