"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  archiveCategoryAction,
  type BudgetActionState,
} from "@/app/(app)/budget/actions";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { BudgetCategory } from "@/lib/domain/budget";

const initialState: BudgetActionState = { error: null, success: null };

type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: BudgetCategory | null;
};

type DeleteFormProps = {
  category: BudgetCategory;
  onClose: () => void;
};

function DeleteForm({ category, onClose }: DeleteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    archiveCategoryAction,
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
          <input type="hidden" name="id" value={category.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={category.updatedAt}
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            className="min-h-11 w-full sm:min-w-24"
            data-testid="confirm-delete-category"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </AlertDialogFooter>
    </>
  );
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
}: DeleteCategoryDialogProps) {
  return (
    <ResponsiveAlertShell
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this category?"
      description={
        category ? (
          <>
            &ldquo;{category.name}&rdquo; will be removed. Past transactions
            stay in your history.
          </>
        ) : undefined
      }
    >
      {open && category ? (
        <DeleteForm category={category} onClose={() => onOpenChange(false)} />
      ) : null}
    </ResponsiveAlertShell>
  );
}
