"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteTransactionAction,
  type BudgetActionState,
} from "@/app/(app)/budget/actions";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatCents, type Transaction } from "@/lib/domain/budget";

const initialState: BudgetActionState = { error: null, success: null };

type DeleteTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
};

type DeleteFormProps = {
  transaction: Transaction;
  onClose: () => void;
};

function DeleteForm({ transaction, onClose }: DeleteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteTransactionAction,
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
          <input type="hidden" name="id" value={transaction.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={transaction.updatedAt}
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            className="min-h-11 w-full sm:min-w-24"
            data-testid="confirm-delete-transaction"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </AlertDialogFooter>
    </>
  );
}

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: DeleteTransactionDialogProps) {
  return (
    <ResponsiveAlertShell
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this transaction?"
      description={
        transaction ? (
          <>
            This removes {formatCents(transaction.amountCents)} from{" "}
            {transaction.occurredOn}. This cannot be undone.
          </>
        ) : undefined
      }
    >
      {open && transaction ? (
        <DeleteForm
          transaction={transaction}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveAlertShell>
  );
}
