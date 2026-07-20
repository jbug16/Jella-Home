"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RecipeSummary } from "@/lib/domain/recipe";

type RecipeComboboxProps = {
  id: string;
  recipes: RecipeSummary[];
  value: string | null;
  disabled?: boolean;
  onChange: (recipeId: string | null, recipeName: string) => void;
};

const MAX_OPTIONS = 40;

export function RecipeCombobox({
  id,
  recipes,
  value,
  disabled,
  onChange,
}: RecipeComboboxProps) {
  const selected = recipes.find((recipe) => recipe.id === value) ?? null;
  const selectedId = selected?.id ?? null;
  const selectedName = selected?.name ?? "";

  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  // Skip one focus-driven open after selecting (commit refocuses the input).
  const suppressOpenOnFocusRef = useRef(false);
  // Sync the input label when a recipe is assigned from outside (not when cleared while typing).
  const lastSyncedIdRef = useRef(selectedId);

  if (selectedId !== lastSyncedIdRef.current) {
    lastSyncedIdRef.current = selectedId;
    if (selectedId != null && query !== selectedName) {
      setQuery(selectedName);
    }
  }

  // Close when clicking outside the field + list (absolute dropdown, not Popover).
  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? recipes.filter((recipe) => recipe.name.toLowerCase().includes(q))
      : recipes;
    return matches.slice(0, MAX_OPTIONS);
  }, [recipes, query]);

  function openList() {
    if (!disabled && recipes.length > 0) {
      setOpen(true);
      setHighlight(0);
    }
  }

  function commit(recipe: RecipeSummary) {
    onChange(recipe.id, recipe.name);
    setQuery(recipe.name);
    lastSyncedIdRef.current = recipe.id;
    setOpen(false);
    suppressOpenOnFocusRef.current = true;
    // Return focus to the field without re-opening the list.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((current) =>
        filtered.length === 0 ? 0 : (current + 1) % filtered.length,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((current) =>
        filtered.length === 0
          ? 0
          : (current - 1 + filtered.length) % filtered.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const recipe = filtered[highlight];
      if (recipe) {
        commit(recipe);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Recipe"
        autoComplete="off"
        disabled={disabled}
        placeholder="Search recipes"
        value={query}
        data-testid="meal-recipe-combobox"
        className="min-h-11"
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          if (selected && next !== selected.name) {
            onChange(null, "");
          }
          if (!disabled && recipes.length > 0) {
            setOpen(true);
            setHighlight(0);
          }
        }}
        onFocus={() => {
          if (suppressOpenOnFocusRef.current) {
            suppressOpenOnFocusRef.current = false;
            return;
          }
          openList();
        }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          data-testid="meal-recipe-options"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No recipes match.
            </li>
          ) : (
            filtered.map((recipe, index) => {
              const isActive = index === highlight;
              const isSelected = recipe.id === value;
              return (
                <li key={recipe.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-sm",
                      isActive ? "bg-accent" : "hover:bg-accent/70",
                    )}
                    data-testid="meal-recipe-option"
                    onMouseEnter={() => setHighlight(index)}
                    // Keep input focus so the list stays open until commit.
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => commit(recipe)}
                  >
                    <span>{recipe.name}</span>
                    {isSelected ? <Check className="size-4" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
