"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { IngredientCombobox } from "@/components/recipes/ingredient-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPROVED_UNITS, RECIPE_UNIT_GROUPS } from "@/lib/domain/recipe";
import type { IngredientSuggestion } from "@/lib/repositories/recipes";

export type IngredientRow = {
  clientId: string;
  quantity: string;
  unit: string;
  name: string;
  notes: string;
};

/** Sentinel for the "no unit" choice (Radix Select disallows an empty value). */
const NO_UNIT = "__none__";

export function newIngredientRow(
  partial: Partial<Omit<IngredientRow, "clientId">> = {},
): IngredientRow {
  return {
    clientId: crypto.randomUUID(),
    quantity: partial.quantity ?? "",
    unit: partial.unit ?? "",
    name: partial.name ?? "",
    notes: partial.notes ?? "",
  };
}

type IngredientRowsProps = {
  rows: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
  suggestions: IngredientSuggestion[];
  disabled?: boolean;
};

export function IngredientRows({
  rows,
  onChange,
  suggestions,
  disabled,
}: IngredientRowsProps) {
  const inputRefs = useRef(new Map<string, HTMLInputElement | null>());
  const pendingFocusRef = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (id) {
      inputRefs.current.get(id)?.focus();
      pendingFocusRef.current = null;
    }
  });

  function updateRow(clientId: string, patch: Partial<IngredientRow>) {
    onChange(
      rows.map((row) =>
        row.clientId === clientId ? { ...row, ...patch } : row,
      ),
    );
  }

  function addRow() {
    const row = newIngredientRow();
    onChange([...rows, row]);
    pendingFocusRef.current = row.clientId;
  }

  function removeRow(clientId: string) {
    const index = rows.findIndex((row) => row.clientId === clientId);
    const next = rows.filter((row) => row.clientId !== clientId);
    onChange(next);
    const focusTarget = next[index - 1] ?? next[0];
    if (focusTarget) {
      pendingFocusRef.current = focusTarget.clientId;
    }
  }

  function move(clientId: string, delta: number) {
    const index = rows.findIndex((row) => row.clientId === clientId);
    const target = index + delta;
    if (target < 0 || target >= rows.length) {
      return;
    }
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
    pendingFocusRef.current = clientId;
  }

  function onSuggestionSelected(
    clientId: string,
    suggestion: IngredientSuggestion,
  ) {
    const current = rows.find((row) => row.clientId === clientId);
    const patch: Partial<IngredientRow> = { name: suggestion.name };
    const defaultUnit = suggestion.defaultUnit.trim().toLowerCase();
    if (!current?.unit && APPROVED_UNITS.includes(defaultUnit)) {
      patch.unit = defaultUnit;
    }
    updateRow(clientId, patch);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <li
            key={row.clientId}
            className="flex flex-col gap-2 rounded-lg border p-3"
            data-testid="ingredient-row"
          >
            <div className="flex gap-2">
              <div className="flex w-24 shrink-0 flex-col gap-1">
                <Label
                  htmlFor={`ing-qty-${row.clientId}`}
                  className="text-xs text-muted-foreground"
                >
                  Qty
                </Label>
                <Input
                  id={`ing-qty-${row.clientId}`}
                  inputMode="decimal"
                  placeholder="1"
                  className="min-h-11"
                  disabled={disabled}
                  aria-label={`Quantity for ingredient ${index + 1}`}
                  value={row.quantity}
                  ref={(el) => {
                    inputRefs.current.set(row.clientId, el);
                  }}
                  onChange={(e) =>
                    updateRow(row.clientId, { quantity: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label
                  htmlFor={`ing-unit-${row.clientId}`}
                  className="text-xs text-muted-foreground"
                >
                  Unit
                </Label>
                <Select
                  disabled={disabled}
                  value={row.unit === "" ? NO_UNIT : row.unit}
                  onValueChange={(value) =>
                    updateRow(row.clientId, {
                      unit: value === NO_UNIT ? "" : value,
                    })
                  }
                >
                  <SelectTrigger
                    id={`ing-unit-${row.clientId}`}
                    aria-label={`Unit for ingredient ${index + 1}`}
                    className="min-h-11 w-full"
                  >
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NO_UNIT} data-testid="unit-option-none">
                      No unit
                    </SelectItem>
                    {/* Preserve a legacy value that is no longer in the list. */}
                    {row.unit !== "" && !APPROVED_UNITS.includes(row.unit) ? (
                      <SelectItem value={row.unit}>{row.unit}</SelectItem>
                    ) : null}
                    {RECIPE_UNIT_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.units.map((unit) => (
                          <SelectItem
                            key={unit.value}
                            value={unit.value}
                            data-testid={`unit-option-${unit.value}`}
                          >
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`ing-name-${row.clientId}`}
                className="text-xs text-muted-foreground"
              >
                Ingredient
              </Label>
              <IngredientCombobox
                id={`ing-name-${row.clientId}`}
                ariaLabel={`Ingredient name for row ${index + 1}`}
                placeholder="Flour"
                disabled={disabled}
                suggestions={suggestions}
                value={row.name}
                onChange={(name) => updateRow(row.clientId, { name })}
                onSelectSuggestion={(suggestion) =>
                  onSuggestionSelected(row.clientId, suggestion)
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`ing-notes-${row.clientId}`}
                className="text-xs text-muted-foreground"
              >
                Notes (optional)
              </Label>
              <Input
                id={`ing-notes-${row.clientId}`}
                placeholder="diced, to taste, …"
                className="min-h-11"
                disabled={disabled}
                aria-label={`Notes for ingredient ${index + 1}`}
                value={row.notes}
                onChange={(e) =>
                  updateRow(row.clientId, { notes: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                disabled={disabled || index === 0}
                aria-label={`Move ${row.name || `ingredient ${index + 1}`} up`}
                onClick={() => move(row.clientId, -1)}
              >
                <ChevronUp className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                disabled={disabled || index === rows.length - 1}
                aria-label={`Move ${row.name || `ingredient ${index + 1}`} down`}
                onClick={() => move(row.clientId, 1)}
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                disabled={disabled || rows.length === 1}
                aria-label={`Remove ${row.name || `ingredient ${index + 1}`}`}
                onClick={() => removeRow(row.clientId)}
                data-testid="remove-ingredient"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={disabled}
        onClick={addRow}
        data-testid="add-ingredient-row"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add ingredient
      </Button>
    </div>
  );
}
