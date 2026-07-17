"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteTransactionAction,
  type BudgetActionState,
} from "@/app/(app)/budget/actions";
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
import { formatCents, type Transaction } from "@/lib/domain/budget";

const initialState: BudgetActionState = { error: null, success: null };

type DeleteTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
};

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: DeleteTransactionDialogProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteTransactionAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onOpenChange(false);
    }
  }, [state.success, onOpenChange, router]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction
              ? `This removes ${formatCents(transaction.amountCents)} from ${transaction.occurredOn}. This cannot be undone.`
              : "This cannot be undone."}
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
            <input type="hidden" name="id" value={transaction?.id ?? ""} />
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || !transaction}
              className="min-h-11"
              data-testid="confirm-delete-transaction"
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
