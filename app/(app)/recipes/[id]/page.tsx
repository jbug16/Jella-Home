import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { RecipeDetailActions } from "@/components/recipes/recipe-detail-actions";
import {
  formatDuration,
  formatQuantity,
  totalTimeMinutes,
} from "@/lib/domain/recipe";
import {
  getRecipe,
  listIngredientSuggestions,
} from "@/lib/repositories/recipes";

export const metadata: Metadata = {
  title: "Recipe",
};

type RecipePageProps = {
  params: Promise<{ id: string }>;
};

function ingredientLabel(quantity: number | null, unit: string): string {
  const amount = formatQuantity(quantity);
  if (quantity === null) {
    return amount;
  }
  return unit ? `${amount} ${unit}` : amount;
}

export default async function RecipeDetailPage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    notFound();
  }

  const suggestions = await listIngredientSuggestions();

  const total = formatDuration(
    totalTimeMinutes(recipe.prepTimeMinutes, recipe.cookTimeMinutes),
  );
  const prep = formatDuration(recipe.prepTimeMinutes);
  const cook = formatDuration(recipe.cookTimeMinutes);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/recipes"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All recipes
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title={recipe.name} />
        <RecipeDetailActions recipe={recipe} suggestions={suggestions} />
      </div>

      {recipe.imageUrl ? (
        <div className="max-w-2xl overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.imageUrl}
            alt={`Photo of ${recipe.name}`}
            className="aspect-[16/10] w-full object-cover"
            data-testid="recipe-hero-image"
          />
        </div>
      ) : null}

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex gap-1">
          <dt className="text-muted-foreground">Servings:</dt>
          <dd className="font-medium" data-testid="recipe-servings">
            {formatQuantity(recipe.servings)}
          </dd>
        </div>
        {prep ? (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Prep:</dt>
            <dd className="font-medium">{prep}</dd>
          </div>
        ) : null}
        {cook ? (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Cook:</dt>
            <dd className="font-medium">{cook}</dd>
          </div>
        ) : null}
        {total ? (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Total:</dt>
            <dd className="font-medium">{total}</dd>
          </div>
        ) : null}
      </dl>

      <section aria-labelledby="ingredients-heading" className="space-y-3">
        <h2 id="ingredients-heading" className="text-lg font-semibold">
          Ingredients
        </h2>
        <ul
          className="divide-y rounded-lg border"
          data-testid="recipe-ingredients"
        >
          {recipe.ingredients.map((line) => (
            <li
              key={line.id}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-2"
            >
              <span className="font-medium">
                {ingredientLabel(line.quantity, line.unit)}
              </span>
              <span>{line.name}</span>
              {line.notes ? (
                <span className="text-sm text-muted-foreground">
                  {line.notes}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {recipe.instructions ? (
        <section aria-labelledby="instructions-heading" className="space-y-3">
          <h2 id="instructions-heading" className="text-lg font-semibold">
            Instructions
          </h2>
          <p className="text-sm whitespace-pre-line">{recipe.instructions}</p>
        </section>
      ) : null}

      {recipe.notes ? (
        <section aria-labelledby="notes-heading" className="space-y-3">
          <h2 id="notes-heading" className="text-lg font-semibold">
            Notes
          </h2>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {recipe.notes}
          </p>
        </section>
      ) : null}
    </div>
  );
}
