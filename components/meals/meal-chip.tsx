"use client";

import { MealSummaryRow } from "@/components/meals/meal-summary-row";
import {
  formatWeekdayShort,
  mealSlotLabel,
  type PlannedMeal,
} from "@/lib/domain/meal-plan";

type MealChipProps = {
  meal: PlannedMeal;
  imageUrl?: string | null;
  onEdit: (meal: PlannedMeal) => void;
};

/** One shared meal display for every day list, regardless of viewport. */
export function MealChip({ meal, imageUrl = null, onEdit }: MealChipProps) {
  const accessibleName = `${meal.title}, ${mealSlotLabel(meal.mealSlot)}, ${formatWeekdayShort(meal.planDate)}`;

  return (
    <MealSummaryRow
      title={meal.title}
      meta={mealSlotLabel(meal.mealSlot)}
      imageUrl={imageUrl}
      ariaLabel={`Edit ${accessibleName}`}
      testId={`meal-chip-open-${meal.id}`}
      notes={meal.notes}
      showNotesIndicator
      onClick={() => onEdit(meal)}
    />
  );
}
