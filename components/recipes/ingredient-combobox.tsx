"use client";

import { Combobox } from "@/components/ui/combobox";
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
  return (
    <Combobox
      id={id}
      ariaLabel={ariaLabel}
      value={value}
      options={suggestions.slice(0, MAX_OPTIONS).map((suggestion) => ({
        value: suggestion.name,
        label: suggestion.name,
        description: suggestion.defaultUnit || undefined,
      }))}
      onValueChange={onChange}
      onSelect={(option) => {
        const suggestion = option
          ? suggestions.find((item) => item.name === option.value)
          : null;
        if (suggestion) onSelectSuggestion?.(suggestion);
      }}
      allowCustomValue
      required
      disabled={disabled}
      placeholder={placeholder}
      optionTestId="ingredient-option"
      addTestId="ingredient-add-new"
    />
  );
}
