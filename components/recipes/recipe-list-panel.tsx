"use client";

import { BookOpen, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { EmptyState } from "@/components/common/empty-state";
import {
  ListRowBody,
  ListRowLink,
  ListRowMeta,
  ListRowTitle,
} from "@/components/common/list-row";
import { SearchPanelHeader } from "@/components/common/panel-header";
import { PanelList } from "@/components/common/panel-list";
import { PrimaryAddButton } from "@/components/common/primary-add-button";
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
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      <SearchPanelHeader
        search={
          <div className="relative min-w-0 w-full">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              className="h-11 w-full pl-9"
              placeholder="Search recipes"
              aria-label="Search recipes"
              value={value}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="recipe-search"
            />
          </div>
        }
        actions={
          <PrimaryAddButton
            label="Add recipe"
            onClick={() => setAddOpen(true)}
            data-testid="open-add-recipe"
          />
        }
      />

      {recipes.length === 0 ? (
        query ? (
          <div
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center sm:gap-3 sm:py-12"
            data-testid="recipes-no-results"
          >
            <p className="text-base font-medium">No recipes match “{query}”</p>
            <Button
              type="button"
              variant="outline"
              size="touch"
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
        <PanelList testId="recipes-list" aria-busy={isPending}>
          {recipes.map((recipe) => (
            <li key={recipe.id} data-testid={`recipe-row-${recipe.id}`}>
              <ListRowLink href={`/recipes/${recipe.id}`}>
                <span
                  className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted sm:size-14"
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
                      className="size-5 text-muted-foreground sm:size-6"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <ListRowBody>
                  <ListRowTitle>{recipe.name}</ListRowTitle>
                  <ListRowMeta>{metadata(recipe)}</ListRowMeta>
                </ListRowBody>
              </ListRowLink>
            </li>
          ))}
        </PanelList>
      )}

      <RecipeFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        suggestions={suggestions}
      />
    </div>
  );
}
