import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { RecipeListPanel } from "@/components/recipes/recipe-list-panel";
import {
  listIngredientSuggestions,
  listRecipes,
} from "@/lib/repositories/recipes";

export const metadata: Metadata = {
  title: "Recipes",
};

type RecipesPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  const [recipes, suggestions] = await Promise.all([
    listRecipes({ search: query }),
    listIngredientSuggestions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recipes"
        description="Keep your household recipes in one place."
      />
      <RecipeListPanel
        recipes={recipes}
        suggestions={suggestions}
        query={query}
      />
    </div>
  );
}
