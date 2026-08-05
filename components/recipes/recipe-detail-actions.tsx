"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { RecipeFormDialog } from "@/components/recipes/recipe-form-dialog";
import { IconButton } from "@/components/ui/icon-button";
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
    <div className="flex gap-1">
      <IconButton
        label="Edit recipe"
        variant="outline"
        onClick={() => setEditOpen(true)}
        data-testid="open-edit-recipe"
      >
        <Pencil className="size-4" aria-hidden />
      </IconButton>
      <IconButton
        label="Delete recipe"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
        data-testid="open-delete-recipe"
      >
        <Trash2 className="size-4" aria-hidden />
      </IconButton>

      <RecipeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        suggestions={suggestions}
        recipe={recipe}
      />
      <DeleteRecipeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        recipe={{
          id: recipe.id,
          name: recipe.name,
          updatedAt: recipe.updatedAt,
        }}
      />
    </div>
  );
}
