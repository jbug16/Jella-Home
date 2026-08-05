"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createTransactionAction,
  updateTransactionAction,
  type BudgetActionState,
} from "@/app/(app)/budget/actions";
import { ResponsiveFormShell } from "@/components/budget/responsive-form-shell";
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
import type { BudgetCategory, Transaction } from "@/lib/domain/budget";
import { defaultOccurredOnForMonth } from "@/lib/domain/budget";

const initialState: BudgetActionState = { error: null, success: null };

type TransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  monthStart: string;
  todayIso: string;
  transaction?: Transaction | null;
};

type TransactionFormProps = Omit<
  TransactionFormDialogProps,
  "open" | "onOpenChange"
> & {
  onClose: () => void;
};

function TransactionForm({
  categories,
  monthStart,
  todayIso,
  transaction,
  onClose,
}: TransactionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(transaction);
  const action = isEdit ? updateTransactionAction : createTransactionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? categories[0]?.id ?? "",
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  const defaultAmount = transaction
    ? (transaction.amountCents / 100).toFixed(2)
    : "";
  const defaultDate = transaction
    ? transaction.occurredOn
    : defaultOccurredOnForMonth(monthStart, todayIso);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {transaction ? (
        <>
          <input type="hidden" name="id" value={transaction.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={transaction.updatedAt}
          />
        </>
      ) : null}
      <input type="hidden" name="categoryId" value={categoryId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          disabled={pending || categories.length === 0}
        >
          <SelectTrigger id="category" className="min-h-11 w-full">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name} ({category.kind})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amountDollars">Amount</Label>
        <Input
          id="amountDollars"
          name="amountDollars"
          inputMode="decimal"
          placeholder="12.50"
          required
          disabled={pending}
          defaultValue={defaultAmount}
          className="min-h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="occurredOn">Date</Label>
        <Input
          id="occurredOn"
          name="occurredOn"
          type="date"
          required
          disabled={pending}
          defaultValue={defaultDate}
          className="min-h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="payee">Payee (optional)</Label>
        <Input
          id="payee"
          name="payee"
          disabled={pending}
          defaultValue={transaction?.payee ?? ""}
          className="min-h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          name="notes"
          disabled={pending}
          defaultValue={transaction?.notes ?? ""}
          className="min-h-11"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !categoryId}
        className="min-h-11 w-full"
        data-testid={isEdit ? "save-transaction" : "add-transaction-submit"}
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add transaction"}
      </Button>
    </form>
  );
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  categories,
  monthStart,
  todayIso,
  transaction,
}: TransactionFormDialogProps) {
  const formKey = open ? `${transaction?.id ?? "new"}-${monthStart}` : "closed";

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={transaction ? "Edit transaction" : "Add transaction"}
      description="Income categories count as money in; everything else is money out."
    >
      <TransactionForm
        key={formKey}
        categories={categories}
        monthStart={monthStart}
        todayIso={todayIso}
        transaction={transaction}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveFormShell>
  );
}
