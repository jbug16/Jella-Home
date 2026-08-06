import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  const [recipe, suggestions] = await Promise.all([
    getRecipe(id),
    listIngredientSuggestions(),
  ]);

  if (!recipe) {
    notFound();
  }

  const total = formatDuration(
    totalTimeMinutes(recipe.prepTimeMinutes, recipe.cookTimeMinutes),
  );
  const prep = formatDuration(recipe.prepTimeMinutes);
  const cook = formatDuration(recipe.cookTimeMinutes);

  return (
    <article className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8 sidebar:gap-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/recipes"
          className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Recipes
        </Link>
        <RecipeDetailActions recipe={recipe} suggestions={suggestions} />
      </div>

      {recipe.imageUrl ? (
        <div className="overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.imageUrl}
            alt={`Photo of ${recipe.name}`}
            className="aspect-video w-full object-cover"
            data-testid="recipe-hero-image"
          />
        </div>
      ) : null}

      <header className="max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sidebar:text-3xl">
          {recipe.name}
        </h1>
        {recipe.notes ? (
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            {recipe.notes}
          </p>
        ) : null}
      </header>

      <dl className="flex flex-wrap gap-x-5 gap-y-2 border-y py-3 text-sm">
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

      <div className="grid gap-8 lg:grid-cols-[minmax(15rem,4fr)_minmax(0,8fr)] lg:gap-12">
        <section aria-labelledby="ingredients-heading" className="space-y-3">
          <h2 id="ingredients-heading" className="text-lg font-semibold">
            Ingredients
          </h2>
          <ul className="divide-y border-y" data-testid="recipe-ingredients">
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

        {recipe.steps.length > 0 ? (
          <section aria-labelledby="instructions-heading" className="space-y-3">
            <h2 id="instructions-heading" className="text-lg font-semibold">
              Instructions
            </h2>
            <ol className="space-y-5" data-testid="recipe-instructions">
              {recipe.steps.map((step, index) => (
                <li
                  key={step.id}
                  className="grid grid-cols-[2rem_1fr] gap-3 text-sm leading-6 sm:text-base"
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <p className="whitespace-pre-line pt-1">{step.instruction}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </article>
  );
}
