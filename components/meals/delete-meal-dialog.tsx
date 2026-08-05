"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deletePlannedMealAction,
  type MealActionState,
} from "@/app/(app)/meals/actions";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { PlannedMeal } from "@/lib/domain/meal-plan";
import { formatWeekdayShort, mealSlotLabel } from "@/lib/domain/meal-plan";

const initialState: MealActionState = { error: null, success: null };

type DeleteMealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: PlannedMeal | null;
};

type DeleteFormProps = {
  meal: PlannedMeal;
  onClose: () => void;
};

function DeleteForm({ meal, onClose }: DeleteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deletePlannedMealAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  return (
    <>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="min-h-11 w-full sm:w-auto sm:min-w-24"
          onClick={onClose}
        >
          Cancel
        </Button>
        <form action={formAction} className="w-full sm:w-auto">
          <input type="hidden" name="id" value={meal.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={meal.updatedAt}
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            className="min-h-11 w-full sm:min-w-24"
            data-testid="confirm-delete-meal"
          >
            {pending ? "Removing…" : "Remove"}
          </Button>
        </form>
      </AlertDialogFooter>
    </>
  );
}

export function DeleteMealDialog({
  open,
  onOpenChange,
  meal,
}: DeleteMealDialogProps) {
  const weekday = meal ? formatWeekdayShort(meal.planDate) : "";
  const slot = meal ? mealSlotLabel(meal.mealSlot) : "";

  return (
    <ResponsiveAlertShell
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this meal?"
      description={
        meal
          ? `Remove “${meal.title}” from ${weekday} ${slot.toLowerCase()}?`
          : undefined
      }
    >
      {open && meal ? (
        <DeleteForm meal={meal} onClose={() => onOpenChange(false)} />
      ) : null}
    </ResponsiveAlertShell>
  );
}
