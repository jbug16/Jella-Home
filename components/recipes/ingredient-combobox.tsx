"use client";

import { Check, Plus } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IngredientSuggestion } from "@/lib/repositories/recipes";

type IngredientComboboxProps = {
  id: string;
  ariaLabel: string;
  value: string;
  suggestions: IngredientSuggestion[];
  disabled?: boolean;
  placeholder?: string;
  /** Free-typed value change (keystrokes, add-new). */
  onChange: (name: string) => void;
  /** An existing ingredient was chosen from the list. */
  onSelectSuggestion?: (suggestion: IngredientSuggestion) => void;
};

const MAX_OPTIONS = 50;

export function IngredientCombobox({
  id,
  ariaLabel,
  value,
  suggestions,
  disabled,
  placeholder,
  onChange,
  onSelectSuggestion,
}: IngredientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const trimmed = value.trim();
  const filtered = useMemo(() => {
    const query = trimmed.toLowerCase();
    const matches = query
      ? suggestions.filter((s) => s.name.toLowerCase().includes(query))
      : suggestions;
    return matches.slice(0, MAX_OPTIONS);
  }, [suggestions, trimmed]);

  const exactMatch = useMemo(
    () =>
      suggestions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase()),
    [suggestions, trimmed],
  );
  const showAddNew = trimmed.length > 0 && !exactMatch;

  // Options are the add-new row (index 0 when shown) followed by matches.
  const optionCount = filtered.length + (showAddNew ? 1 : 0);

  function openList() {
    if (!disabled && optionCount > 0) {
      setOpen(true);
      setHighlight(0);
    }
  }

  function commitAddNew() {
    onChange(trimmed);
    setOpen(false);
  }

  function commitSuggestion(suggestion: IngredientSuggestion) {
    onChange(suggestion.name);
    onSelectSuggestion?.(suggestion);
    setOpen(false);
  }

  function commitHighlighted() {
    if (showAddNew && highlight === 0) {
      commitAddNew();
      return;
    }
    const index = showAddNew ? highlight - 1 : highlight;
    const suggestion = filtered[index];
    if (suggestion) {
      commitSuggestion(suggestion);
    } else if (trimmed) {
      commitAddNew();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((prev) =>
        optionCount === 0 ? 0 : (prev + 1) % optionCount,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        return;
      }
      setHighlight((prev) =>
        optionCount === 0 ? 0 : (prev - 1 + optionCount) % optionCount,
      );
    } else if (event.key === "Enter") {
      if (open && optionCount > 0) {
        event.preventDefault();
        commitHighlighted();
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  }

  return (
    <Popover open={open && optionCount > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="min-h-11"
          required
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setHighlight(0);
            if (!disabled) {
              setOpen(true);
            }
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        />
      </PopoverAnchor>
      <PopoverContent
        id={listId}
        role="listbox"
        className="max-h-64 w-[var(--radix-popover-trigger-width)] overflow-y-auto"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {showAddNew ? (
          <button
            type="button"
            role="option"
            aria-selected={highlight === 0}
            data-testid="ingredient-add-new"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm",
              highlight === 0 ? "bg-accent text-accent-foreground" : "",
            )}
            onMouseEnter={() => setHighlight(0)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={commitAddNew}
          >
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Add <span className="font-medium">“{trimmed}”</span>
            </span>
          </button>
        ) : null}

        {filtered.map((suggestion, index) => {
          const optionIndex = showAddNew ? index + 1 : index;
          const isSelected =
            suggestion.name.toLowerCase() === trimmed.toLowerCase();
          return (
            <button
              key={suggestion.name}
              type="button"
              role="option"
              aria-selected={highlight === optionIndex}
              data-testid="ingredient-option"
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm",
                highlight === optionIndex
                  ? "bg-accent text-accent-foreground"
                  : "",
              )}
              onMouseEnter={() => setHighlight(optionIndex)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitSuggestion(suggestion)}
            >
              <span className="truncate">{suggestion.name}</span>
              {suggestion.defaultUnit ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {suggestion.defaultUnit}
                </span>
              ) : null}
              {isSelected ? (
                <Check className="size-4 shrink-0" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
