"use client";

import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RecipeFormDialog } from "@/components/recipes/recipe-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDuration,
  totalTimeMinutes,
  type RecipeSummary,
} from "@/lib/domain/recipe";
import type { IngredientSuggestion } from "@/lib/repositories/recipes";

type RecipeListPanelProps = {
  recipes: RecipeSummary[];
  suggestions: IngredientSuggestion[];
  query: string;
};

function metadata(recipe: RecipeSummary): string {
  const parts = [
    `${recipe.servings} ${recipe.servings === 1 ? "serving" : "servings"}`,
  ];
  const total = formatDuration(
    totalTimeMinutes(recipe.prepTimeMinutes, recipe.cookTimeMinutes),
  );
  if (total) {
    parts.push(`${total} total`);
  }
  parts.push(
    `${recipe.ingredientCount} ${
      recipe.ingredientCount === 1 ? "ingredient" : "ingredients"
    }`,
  );
  return parts.join(" · ");
}

export function RecipeListPanel({
  recipes,
  suggestions,
  query,
}: RecipeListPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [value, setValue] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reflect external navigation (back button, cleared search) into the input
  // without an effect. See https://react.dev/learn/you-might-not-need-an-effect.
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setValue(query);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function pushQuery(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) {
      params.set("q", next.trim());
    } else {
      params.delete("q");
    }
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  }

  function onSearchChange(next: string) {
    setValue(next);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => pushQuery(next), 250);
  }

  function clearSearch() {
    setValue("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    pushQuery("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            className="min-h-11 pl-9"
            placeholder="Search recipes"
            aria-label="Search recipes"
            value={value}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="recipe-search"
          />
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => setAddOpen(true)}
          data-testid="open-add-recipe"
        >
          Add recipe
        </Button>
      </div>

      {recipes.length === 0 ? (
        query ? (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center"
            data-testid="recipes-no-results"
          >
            <p className="text-base font-medium">No recipes match “{query}”</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={clearSearch}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No recipes yet"
            description="Add your first recipe to start your collection."
          />
        )
      ) : (
        <ul
          className="divide-y rounded-lg border"
          data-testid="recipes-list"
          aria-busy={isPending}
        >
          {recipes.map((recipe) => (
            <li key={recipe.id} data-testid={`recipe-row-${recipe.id}`}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="flex min-h-11 items-center gap-4 px-4 py-3 hover:bg-accent"
              >
                <span
                  className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted sm:size-24"
                  aria-hidden="true"
                >
                  {recipe.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                      data-testid="recipe-thumbnail"
                    />
                  ) : (
                    <BookOpen
                      className="size-7 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{recipe.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {metadata(recipe)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <RecipeFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        suggestions={suggestions}
      />
    </div>
  );
}
