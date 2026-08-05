"use client";

import { useActionState } from "react";

import {
  deleteRecipeAction,
  type RecipeActionState,
} from "@/app/(app)/recipes/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// On success `deleteRecipeAction` performs a server-side redirect to /recipes,
// so there is no client success state to react to here.
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
          <AlertDialogDescription>
            {recipe
              ? `“${recipe.name}” will be removed from your recipes. This cannot be undone.`
              : "This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} className="min-h-11">
            Cancel
          </AlertDialogCancel>
          <form action={formAction}>
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
              className="min-h-11"
              data-testid="confirm-delete-recipe"
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
