"use client";

import { useState } from "react";

import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { RecipeFormDialog } from "@/components/recipes/recipe-form-dialog";
import { Button } from "@/components/ui/button";
import type { RecipeDetail } from "@/lib/domain/recipe";
import type { IngredientSuggestion } from "@/lib/repositories/recipes";

type RecipeDetailActionsProps = {
  recipe: RecipeDetail;
  suggestions: IngredientSuggestion[];
};

export function RecipeDetailActions({
  recipe,
  suggestions,
}: RecipeDetailActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => setEditOpen(true)}
        data-testid="open-edit-recipe"
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => setDeleteOpen(true)}
        data-testid="open-delete-recipe"
      >
        Delete
      </Button>

      <RecipeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        suggestions={suggestions}
        recipe={recipe}
      />
      <DeleteRecipeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        recipe={{ id: recipe.id, name: recipe.name }}
      />
    </div>
  );
}
