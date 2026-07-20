"use client";

import { StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatWeekdayShort,
  mealSlotLabel,
  type PlannedMeal,
} from "@/lib/domain/meal-plan";
import { cn } from "@/lib/utils";

/** Household default — omit from cards when servings match. */
export const HOUSEHOLD_DEFAULT_SERVINGS = 2;

type MealChipProps = {
  meal: PlannedMeal;
  imageUrl?: string | null;
  /** Image-forward tile for the week board (default). */
  variant?: "board" | "row";
  onEdit: (meal: PlannedMeal) => void;
  onDelete: (meal: PlannedMeal) => void;
};

export function MealChip({
  meal,
  imageUrl = null,
  variant = "board",
  onEdit,
  onDelete,
}: MealChipProps) {
  const accessibleName = `${meal.title}, ${mealSlotLabel(meal.mealSlot)}, ${formatWeekdayShort(meal.planDate)}`;
  const hasImage = Boolean(imageUrl);

  if (variant === "row") {
    return (
      <div
        className="group/meal relative flex min-w-0 items-start gap-0.5 rounded-xl bg-card p-2 shadow-sm ring-1 ring-border/50"
        data-testid={`meal-chip-${meal.id}`}
        data-meal-notes={meal.notes}
      >
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-start gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Edit ${accessibleName}`}
          data-testid={`meal-chip-open-${meal.id}`}
          onClick={() => onEdit(meal)}
        >
          {hasImage ? (
            <Cover imageUrl={imageUrl!} className="size-12 rounded-lg border" />
          ) : null}
          <span className="min-w-0 flex-1 py-0.5">
            <span className="block truncate text-sm leading-snug font-semibold text-foreground">
              {meal.title}
            </span>
            <MealMeta meal={meal} />
          </span>
        </button>
        <DeleteButton
          meal={meal}
          accessibleName={accessibleName}
          className="mt-0.5 size-8 shrink-0 text-muted-foreground/55 hover:bg-transparent hover:text-destructive"
          onDelete={onDelete}
        />
      </div>
    );
  }

  return (
    <div
      className="group/meal relative min-w-0 overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border/40"
      data-testid={`meal-chip-${meal.id}`}
      data-meal-notes={meal.notes}
    >
      <button
        type="button"
        className="flex w-full min-w-0 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label={`Edit ${accessibleName}`}
        data-testid={`meal-chip-open-${meal.id}`}
        onClick={() => onEdit(meal)}
      >
        {hasImage ? (
          <Cover
            imageUrl={imageUrl!}
            className="aspect-[5/4] w-full rounded-none"
          />
        ) : null}
        <span
          className={cn(
            "flex min-w-0 flex-col gap-0.5 pr-9",
            hasImage ? "px-2 pt-1.5 pb-2" : "px-2 py-2",
          )}
        >
          <span className="truncate text-[13px] leading-snug font-semibold text-foreground">
            {meal.title}
          </span>
          <MealMeta meal={meal} />
        </span>
      </button>
      <DeleteButton
        meal={meal}
        accessibleName={accessibleName}
        className="absolute right-0.5 bottom-0.5 size-8 text-muted-foreground/50 hover:bg-transparent hover:text-destructive"
        onDelete={onDelete}
      />
    </div>
  );
}

/** Recipe image only — omitted entirely when the recipe has no image. */
function Cover({
  imageUrl,
  className,
}: {
  imageUrl: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted",
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs; same pattern as recipe list */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="size-full object-cover"
        data-testid="meal-chip-thumbnail"
      />
    </span>
  );
}

function MealMeta({ meal }: { meal: PlannedMeal }) {
  const showServings =
    meal.servings != null && meal.servings !== HOUSEHOLD_DEFAULT_SERVINGS;

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] leading-none text-muted-foreground">
      <span>{mealSlotLabel(meal.mealSlot)}</span>
      {meal.notes ? (
        <span className="inline-flex items-center" title="Has notes">
          <StickyNote className="size-3 opacity-70" aria-hidden />
          <span className="sr-only">Has notes</span>
        </span>
      ) : null}
      {showServings ? <span>{meal.servings} servings</span> : null}
      {meal.recipeArchived ? <span>Archived</span> : null}
    </span>
  );
}

function DeleteButton({
  meal,
  accessibleName,
  className,
  onDelete,
}: {
  meal: PlannedMeal;
  accessibleName: string;
  className?: string;
  onDelete: (meal: PlannedMeal) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={`Delete ${accessibleName}`}
      data-testid={`meal-delete-${meal.id}`}
      onClick={() => onDelete(meal)}
    >
      <Trash2 className="size-3.5" aria-hidden />
    </Button>
  );
}
