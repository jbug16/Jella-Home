"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type RecipeStepRow = { id: string; instruction: string };

export function newRecipeStep(instruction = ""): RecipeStepRow {
  return { id: crypto.randomUUID(), instruction };
}

export function RecipeStepRows({
  steps,
  onChange,
  disabled,
}: {
  steps: RecipeStepRow[];
  onChange: (steps: RecipeStepRow[]) => void;
  disabled?: boolean;
}) {
  function move(index: number, delta: number) {
    const next = [...steps];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-3" data-testid="recipe-step-rows">
      {steps.map((step, index) => (
        <div key={step.id} className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Label htmlFor={`recipe-step-${step.id}`}>Step {index + 1}</Label>
            <div className="flex">
              <IconButton
                label={`Move step ${index + 1} up`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton
                label={`Move step ${index + 1} down`}
                disabled={disabled || index === steps.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </IconButton>
              <IconButton
                label={`Remove step ${index + 1}`}
                className="text-destructive hover:text-destructive"
                disabled={disabled}
                onClick={() =>
                  onChange(steps.filter((row) => row.id !== step.id))
                }
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          </div>
          <Textarea
            id={`recipe-step-${step.id}`}
            value={step.instruction}
            maxLength={2_000}
            disabled={disabled}
            className="min-h-24"
            placeholder="Describe this step…"
            onChange={(event) =>
              onChange(
                steps.map((row) =>
                  row.id === step.id
                    ? { ...row, instruction: event.target.value }
                    : row,
                ),
              )
            }
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="w-full"
        disabled={disabled || steps.length >= 100}
        data-testid="add-recipe-step"
        onClick={() => onChange([...steps, newRecipeStep()])}
      >
        <Plus className="size-4" /> Add step
      </Button>
    </div>
  );
}
