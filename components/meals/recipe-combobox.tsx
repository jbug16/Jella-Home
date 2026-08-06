"use client";

import { useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import type { RecipeSummary } from "@/lib/domain/recipe";

type RecipeComboboxProps = {
  id: string;
  recipes: RecipeSummary[];
  value: string | null;
  disabled?: boolean;
  onChange: (recipeId: string | null, recipeName: string) => void;
};

export function RecipeCombobox({
  id,
  recipes,
  value,
  disabled,
  onChange,
}: RecipeComboboxProps) {
  const selected = recipes.find((recipe) => recipe.id === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");

  return (
    <Combobox
      id={id}
      ariaLabel="Recipe"
      value={query}
      options={recipes.map((recipe) => ({
        value: recipe.id,
        label: recipe.name,
      }))}
      onValueChange={setQuery}
      onSelect={(option) =>
        onChange(option?.value ?? null, option?.label ?? "")
      }
      disabled={disabled}
      placeholder="Search recipes"
      inputTestId="meal-recipe-combobox"
      optionTestId="meal-recipe-option"
    />
  );
}
