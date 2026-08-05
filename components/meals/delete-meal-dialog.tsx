"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deletePlannedMealAction,
  type MealActionState,
} from "@/app/(app)/meals/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  const weekday = formatWeekdayShort(meal.planDate);
  const slot = mealSlotLabel(meal.mealSlot);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove this meal?</AlertDialogTitle>
        <AlertDialogDescription>
          {`Remove “${meal.title}” from ${weekday} ${slot.toLowerCase()}?`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending} className="min-h-11">
          Cancel
        </AlertDialogCancel>
        <form action={formAction}>
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
            className="min-h-11"
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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {open && meal ? (
          <DeleteForm meal={meal} onClose={() => onOpenChange(false)} />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
