import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RecipeDetailActions } from "@/components/recipes/recipe-detail-actions";
import { IconButton } from "@/components/ui/icon-button";
import { formatQuantity, totalTimeMinutes } from "@/lib/domain/recipe";
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

function compactDuration(minutes: number | null): string {
  if (minutes === null) {
    return "—";
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) {
    return `${remainder}m`;
  }
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
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

  const total = compactDuration(
    totalTimeMinutes(recipe.prepTimeMinutes, recipe.cookTimeMinutes),
  );
  const prep = compactDuration(recipe.prepTimeMinutes);
  const cook = compactDuration(recipe.cookTimeMinutes);

  return (
    <article className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8 sidebar:gap-8">
      <div className="-mx-2">
        <IconButton asChild label="Back to recipes">
          <Link href="/recipes">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </IconButton>
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

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight sidebar:text-3xl">
            {recipe.name}
          </h1>
          <RecipeDetailActions recipe={recipe} suggestions={suggestions} />
        </div>
        {recipe.notes ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {recipe.notes}
          </p>
        ) : null}
      </header>

      <dl
        className="grid grid-cols-4 divide-x border-y py-3 text-center"
        data-testid="recipe-metadata"
      >
        <div className="min-w-0 px-1">
          <dt className="whitespace-nowrap text-[0.6875rem] text-muted-foreground sm:text-xs">
            Serves
          </dt>
          <dd
            className="whitespace-nowrap text-sm font-medium"
            data-testid="recipe-servings"
          >
            {formatQuantity(recipe.servings)}
          </dd>
        </div>
        <div className="min-w-0 px-1">
          <dt className="whitespace-nowrap text-[0.6875rem] text-muted-foreground sm:text-xs">
            Prep
          </dt>
          <dd className="whitespace-nowrap text-sm font-medium">{prep}</dd>
        </div>
        <div className="min-w-0 px-1">
          <dt className="whitespace-nowrap text-[0.6875rem] text-muted-foreground sm:text-xs">
            Cook
          </dt>
          <dd className="whitespace-nowrap text-sm font-medium">{cook}</dd>
        </div>
        <div className="min-w-0 px-1">
          <dt className="whitespace-nowrap text-[0.6875rem] text-muted-foreground sm:text-xs">
            Total
          </dt>
          <dd className="whitespace-nowrap text-sm font-medium">{total}</dd>
        </div>
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
