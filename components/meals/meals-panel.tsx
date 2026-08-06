"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { DeleteMealDialog } from "@/components/meals/delete-meal-dialog";
import { MealChip } from "@/components/meals/meal-chip";
import {
  MealFormDialog,
  type MealFormDefaults,
} from "@/components/meals/meal-form-dialog";
import { QuietDayAdd } from "@/components/meals/quiet-day-add";
import { WeekNavigator } from "@/components/meals/week-navigator";
import { PeriodPanelHeader } from "@/components/common/panel-header";
import { PrimaryAddButton } from "@/components/common/primary-add-button";
import {
  daysInWeek,
  formatDayOfMonth,
  formatWeekdayShort,
  groupMealsByDate,
  type MealSlot,
  type PlannedMeal,
} from "@/lib/domain/meal-plan";
import type { RecipeSummary } from "@/lib/domain/recipe";
import { cn } from "@/lib/utils";

type MealsPanelProps = {
  weekStart: string;
  todayIso: string;
  meals: PlannedMeal[];
  recipes: RecipeSummary[];
};

type DialogState =
  | { type: "closed" }
  | { type: "form"; meal?: PlannedMeal; defaults: MealFormDefaults }
  | { type: "delete"; meal: PlannedMeal };

type MealHandlers = {
  onAdd: (planDate: string, mealSlot: MealSlot) => void;
  onEdit: (meal: PlannedMeal) => void;
  onDelete: (meal: PlannedMeal) => void;
};

/** Matches Tailwind `lg` — day spine below, image week board at lg+. */
const NARROW_QUERY = "(max-width: 1023px)";

function subscribeNarrow(onStoreChange: () => void) {
  const media = window.matchMedia(NARROW_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getNarrowSnapshot() {
  return window.matchMedia(NARROW_QUERY).matches;
}

function getNarrowServerSnapshot() {
  return false;
}

function dayLabel(day: string) {
  return `${formatWeekdayShort(day)} ${formatDayOfMonth(day)}`;
}

export function MealsPanel({
  weekStart,
  todayIso,
  meals,
  recipes,
}: MealsPanelProps) {
  const weekDays = useMemo(() => daysInWeek(weekStart), [weekStart]);
  const byDate = useMemo(
    () => groupMealsByDate(meals, weekStart),
    [meals, weekStart],
  );
  const recipeImageById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const recipe of recipes) {
      map.set(recipe.id, recipe.imageUrl);
    }
    return map;
  }, [recipes]);

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isNarrow = useSyncExternalStore(
    subscribeNarrow,
    getNarrowSnapshot,
    getNarrowServerSnapshot,
  );

  const defaultDay = weekDays.includes(todayIso) ? todayIso : weekStart;
  const openDays = weekDays.filter(
    (day) => (byDate.get(day) ?? []).length === 0,
  );
  const preferredAddDay = openDays[0] ?? defaultDay;

  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });

  function openAdd(planDate: string, mealSlot: MealSlot) {
    setDialog({
      type: "form",
      defaults: { planDate, mealSlot },
    });
  }

  function closeDialog() {
    setDialog({ type: "closed" });
  }

  const handlers: MealHandlers = {
    onAdd: openAdd,
    // Defer so the triggering click cannot dismiss the dialog/sheet as an
    // outside interaction (Radix focus/dismiss timing).
    onEdit: (meal) => {
      window.setTimeout(() => {
        setDialog({
          type: "form",
          meal,
          defaults: {
            planDate: meal.planDate,
            mealSlot: meal.mealSlot === "other" ? "snack" : meal.mealSlot,
          },
        });
      }, 0);
    },
    onDelete: (meal) => {
      window.setTimeout(() => {
        setDialog({ type: "delete", meal });
      }, 0);
    },
  };

  function imageFor(meal: PlannedMeal): string | null {
    if (!meal.recipeId) {
      return null;
    }
    return recipeImageById.get(meal.recipeId) ?? null;
  }

  return (
    <div
      className="flex min-w-0 max-w-full flex-col gap-3"
      data-testid="meals-panel"
    >
      <PeriodPanelHeader
        navigator={<WeekNavigator weekStart={weekStart} />}
        actions={
          <PrimaryAddButton
            label="Plan a meal"
            onClick={() => openAdd(preferredAddDay, "dinner")}
            data-testid="open-add-meal"
          />
        }
      />

      {!isMounted ? (
        <div
          className="min-h-48 rounded-xl bg-muted/20"
          aria-hidden
          data-testid="meals-layout-pending"
        />
      ) : isNarrow ? (
        <PhoneDaySpine
          weekDays={weekDays}
          todayIso={todayIso}
          byDate={byDate}
          imageFor={imageFor}
          handlers={handlers}
        />
      ) : (
        <ImageWeekBoard
          weekDays={weekDays}
          todayIso={todayIso}
          byDate={byDate}
          imageFor={imageFor}
          handlers={handlers}
        />
      )}

      <MealFormDialog
        key={
          dialog.type === "form"
            ? `meal-form-${dialog.meal?.id ?? "new"}`
            : "meal-form-closed"
        }
        open={dialog.type === "form"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        recipes={recipes}
        weekDays={weekDays}
        defaults={
          dialog.type === "form"
            ? dialog.defaults
            : { planDate: preferredAddDay, mealSlot: "dinner" }
        }
        meal={dialog.type === "form" ? (dialog.meal ?? null) : null}
        onDelete={handlers.onDelete}
      />

      <DeleteMealDialog
        key={dialog.type === "delete" ? dialog.meal.id : "delete-meal-closed"}
        open={dialog.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        meal={dialog.type === "delete" ? dialog.meal : null}
      />
    </div>
  );
}

/** Desktop: readable day panels using the same meal rows as mobile. */
function ImageWeekBoard({
  weekDays,
  todayIso,
  byDate,
  imageFor,
  handlers,
}: {
  weekDays: string[];
  todayIso: string;
  byDate: Map<string, PlannedMeal[]>;
  imageFor: (meal: PlannedMeal) => string | null;
  handlers: MealHandlers;
}) {
  return (
    <div
      className="grid min-w-0 max-w-full gap-3 lg:grid-cols-2 2xl:grid-cols-3"
      data-testid="meals-week-grid"
      role="list"
      aria-label="This week’s meals"
    >
      {weekDays.map((day) => {
        const dayMeals = byDate.get(day) ?? [];
        const isToday = day === todayIso;

        return (
          <section
            key={day}
            role="listitem"
            className="flex min-w-0 flex-col gap-2 rounded-xl border p-3"
            data-testid={`meals-day-column-${day}`}
          >
            <MealDayHeading day={day} isToday={isToday} />
            <div className="flex flex-1 flex-col gap-1">
              {dayMeals.map((meal) => (
                <MealChip
                  key={meal.id}
                  meal={meal}
                  imageUrl={imageFor(meal)}
                  onEdit={handlers.onEdit}
                />
              ))}
              <QuietDayAdd
                label={`Plan a meal for ${dayLabel(day)}`}
                testId={`meals-day-add-${day}`}
                onAdd={() => handlers.onAdd(day, "dinner")}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Phone: only days with meals (plus today if empty) — one line per meal. */
function PhoneDaySpine({
  weekDays,
  todayIso,
  byDate,
  imageFor,
  handlers,
}: {
  weekDays: string[];
  todayIso: string;
  byDate: Map<string, PlannedMeal[]>;
  imageFor: (meal: PlannedMeal) => string | null;
  handlers: MealHandlers;
}) {
  const visibleDays = weekDays.filter((day) => {
    const count = (byDate.get(day) ?? []).length;
    return count > 0 || day === todayIso;
  });

  return (
    <ul className="divide-y rounded-lg border" data-testid="meals-day-spine">
      {visibleDays.map((day) => {
        const dayMeals = byDate.get(day) ?? [];
        const isToday = day === todayIso;

        return (
          <li
            key={day}
            id={`meals-day-${day}`}
            className={cn(
              "scroll-mt-16 px-3 py-2",
              isToday ? "bg-muted/20" : null,
            )}
            data-testid={`meals-slots-${day}`}
          >
            <MealDayHeading day={day} isToday={isToday} />
            {dayMeals.length > 0 ? (
              <div className="flex flex-col gap-1">
                {dayMeals.map((meal) => (
                  <MealChip
                    key={meal.id}
                    meal={meal}
                    imageUrl={imageFor(meal)}
                    onEdit={handlers.onEdit}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nothing planned</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MealDayHeading({ day, isToday }: { day: string; isToday: boolean }) {
  return (
    <p
      className={cn(
        "mb-1 inline-flex w-fit items-baseline gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        isToday ? "bg-foreground text-background" : "text-muted-foreground",
      )}
      data-testid={isToday ? "meals-today-heading" : undefined}
    >
      <span>{formatWeekdayShort(day)}</span>
      <span className="tabular-nums">{formatDayOfMonth(day)}</span>
    </p>
  );
}
