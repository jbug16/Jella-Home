"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createPlannedMealAction,
  updatePlannedMealAction,
  type MealActionState,
} from "@/app/(app)/meals/actions";
import {
  FormError,
  FormScrollBody,
  FormStickyFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import { RecipeCombobox } from "@/components/meals/recipe-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  formatDayOfMonth,
  formatWeekdayShort,
  type MealSlot,
  type PlannedMeal,
} from "@/lib/domain/meal-plan";
import type { RecipeSummary } from "@/lib/domain/recipe";
import { cn } from "@/lib/utils";

const initialState: MealActionState = { error: null, success: null };

export type MealFormDefaults = {
  planDate: string;
  mealSlot: MealSlot;
};

type MealFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: RecipeSummary[];
  weekDays: string[];
  defaults: MealFormDefaults;
  meal?: PlannedMeal | null;
  onDelete?: (meal: PlannedMeal) => void;
};

type MealFormProps = {
  recipes: RecipeSummary[];
  weekDays: string[];
  defaults: MealFormDefaults;
  meal?: PlannedMeal | null;
  onClose: () => void;
  onDelete?: (meal: PlannedMeal) => void;
};

function MealForm({
  recipes,
  weekDays,
  defaults,
  meal,
  onClose,
  onDelete,
}: MealFormProps) {
  const router = useRouter();
  const isEdit = Boolean(meal);
  const action = isEdit ? updatePlannedMealAction : createPlannedMealAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const initialMode: "recipe" | "custom" =
    meal && !meal.recipeId ? "custom" : "recipe";
  const [mode, setMode] = useState<"recipe" | "custom">(initialMode);
  const [planDate, setPlanDate] = useState(meal?.planDate ?? defaults.planDate);
  const [planDates, setPlanDates] = useState<string[]>([defaults.planDate]);
  const [mealSlot, setMealSlot] = useState<MealSlot>(
    meal && meal.mealSlot !== "other" ? meal.mealSlot : defaults.mealSlot,
  );
  const [recipeId, setRecipeId] = useState<string | null>(
    meal?.recipeId ?? null,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  function toggleDay(day: string) {
    setPlanDates((current) => {
      if (current.includes(day)) {
        return current.filter((value) => value !== day);
      }
      return [...current, day].sort();
    });
  }

  const canSubmit =
    !pending &&
    (mode === "custom" || Boolean(recipeId)) &&
    (isEdit || planDates.length > 0);

  return (
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
      key={meal?.id ?? "new"}
    >
      {meal ? (
        <>
          <input type="hidden" name="id" value={meal.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={meal.updatedAt}
          />
        </>
      ) : null}
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="mealSlot" value={mealSlot} />
      <input type="hidden" name="recipeId" value={recipeId ?? ""} />
      {isEdit ? (
        <input type="hidden" name="planDate" value={planDate} />
      ) : (
        planDates.map((day) => (
          <input key={day} type="hidden" name="planDates" value={day} />
        ))
      )}

      <FormScrollBody>
        <div className="flex flex-col gap-4">
          {isEdit ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="meal-date">Day</Label>
              <Select
                value={planDate}
                onValueChange={setPlanDate}
                disabled={pending}
              >
                <SelectTrigger
                  id="meal-date"
                  className="min-h-11 w-full"
                  data-testid="meal-date-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {formatWeekdayShort(day)} {formatDayOfMonth(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Days</Label>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={pending}
                    data-testid="meal-days-all"
                    onClick={() => setPlanDates([...weekDays])}
                  >
                    All week
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={pending}
                    data-testid="meal-days-weekdays"
                    onClick={() =>
                      setPlanDates(
                        weekDays.filter((day) => {
                          const weekday = new Date(`${day}T12:00:00`).getDay();
                          return weekday >= 1 && weekday <= 5;
                        }),
                      )
                    }
                  >
                    Weekdays
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={pending}
                    data-testid="meal-days-reset"
                    onClick={() => setPlanDates([defaults.planDate])}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div
                className="grid grid-cols-7 gap-1.5"
                role="group"
                aria-label="Days to plan"
                data-testid="meal-days-picker"
              >
                {weekDays.map((day) => {
                  const selected = planDates.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      disabled={pending}
                      data-testid={`meal-day-${day}`}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center rounded-lg border px-1 text-center transition-colors",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                      )}
                      onClick={() => toggleDay(day)}
                    >
                      <span className="text-[10px] font-semibold tracking-[0.06em] uppercase">
                        {formatWeekdayShort(day)}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatDayOfMonth(day)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {planDates.length === 0
                  ? "Select at least one day to add this meal."
                  : planDates.length === 1
                    ? "Adding to 1 day"
                    : `Adding to ${planDates.length} days`}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="meal-slot">Meal</Label>
            <Select
              value={mealSlot}
              onValueChange={(value) => setMealSlot(value as MealSlot)}
              disabled={pending}
            >
              <SelectTrigger
                id="meal-slot"
                className="min-h-11 w-full"
                data-testid="meal-slot-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {MEAL_SLOT_LABELS[slot]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "recipe" ? "default" : "outline"}
              className="min-h-11 flex-1"
              disabled={pending}
              data-testid="meal-mode-recipe"
              onClick={() => setMode("recipe")}
            >
              Recipe
            </Button>
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              className="min-h-11 flex-1"
              disabled={pending}
              data-testid="meal-mode-custom"
              onClick={() => {
                setMode("custom");
                setRecipeId(null);
              }}
            >
              Something else
            </Button>
          </div>

          {mode === "recipe" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="meal-recipe">Recipe</Label>
              {recipes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recipes yet.{" "}
                  <Link
                    href="/recipes"
                    className="underline underline-offset-2"
                  >
                    Add a recipe
                  </Link>{" "}
                  or use “Something else”.
                </p>
              ) : (
                <RecipeCombobox
                  id="meal-recipe"
                  recipes={recipes}
                  value={recipeId}
                  disabled={pending}
                  onChange={(id) => setRecipeId(id)}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="meal-title">Name</Label>
              <Input
                id="meal-title"
                name="title"
                required
                disabled={pending}
                defaultValue={meal && !meal.recipeId ? meal.title : ""}
                className="min-h-11"
                data-testid="meal-custom-title"
                placeholder="Takeout, leftovers…"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="meal-servings">Servings (optional)</Label>
            <Input
              id="meal-servings"
              name="servings"
              inputMode="decimal"
              disabled={pending}
              defaultValue={meal?.servings != null ? String(meal.servings) : ""}
              className="min-h-11"
              placeholder="Same as recipe"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="meal-notes">Notes</Label>
            <Textarea
              id="meal-notes"
              name="notes"
              disabled={pending}
              defaultValue={meal?.notes ?? ""}
              className="min-h-24"
              data-testid="meal-notes"
              placeholder="Optional notes"
            />
          </div>

          <FormError message={state.error} />
        </div>
      </FormScrollBody>

      <FormStickyFooter>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          {meal && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="min-h-11 w-full text-destructive hover:text-destructive sm:hidden"
              data-testid={`meal-delete-${meal.id}`}
              onClick={() => onDelete(meal)}
            >
              Delete meal
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="min-h-11 w-full sm:w-auto"
            data-testid="meal-form-submit"
          >
            {pending
              ? "Saving…"
              : isEdit
                ? "Save meal"
                : planDates.length > 1
                  ? `Add to ${planDates.length} days`
                  : "Add meal"}
          </Button>
        </div>
      </FormStickyFooter>
    </form>
  );
}

export function MealFormDialog({
  open,
  onOpenChange,
  recipes,
  weekDays,
  defaults,
  meal,
  onDelete,
}: MealFormDialogProps) {
  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={meal ? "Edit meal" : "Plan a meal"}
      description={
        meal
          ? "Update the day, slot, recipe, or notes."
          : "Choose a recipe and one or more days."
      }
      desktopWidthClassName="sm:max-w-lg"
    >
      {open ? (
        <MealForm
          recipes={recipes}
          weekDays={weekDays}
          defaults={defaults}
          meal={meal}
          onClose={() => onOpenChange(false)}
          onDelete={onDelete}
        />
      ) : null}
    </ResponsiveFormShell>
  );
}
