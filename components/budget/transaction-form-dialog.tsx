"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createTransactionAction,
  updateTransactionAction,
  type BudgetActionState,
} from "@/app/(app)/budget/actions";
import {
  FormScrollBody,
  FormStickyFooter,
  ResponsiveFormShell,
} from "@/components/budget/responsive-form-shell";
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
  onDelete?: () => void;
};

type TransactionFormProps = Omit<
  TransactionFormDialogProps,
  "open" | "onOpenChange"
> & {
  onClose: () => void;
};

function TransactionFields({
  categories,
  monthStart,
  todayIso,
  transaction,
  pending,
  categoryId,
  setCategoryId,
}: {
  categories: BudgetCategory[];
  monthStart: string;
  todayIso: string;
  transaction?: Transaction | null;
  pending: boolean;
  categoryId: string;
  setCategoryId: (value: string) => void;
}) {
  const defaultAmount = transaction
    ? (transaction.amountCents / 100).toFixed(2)
    : "";
  const defaultDate = transaction
    ? transaction.occurredOn
    : defaultOccurredOnForMonth(monthStart, todayIso);

  return (
    <>
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
    </>
  );
}

function TransactionForm({
  categories,
  monthStart,
  todayIso,
  transaction,
  onClose,
  onDelete,
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

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
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

      <FormScrollBody>
        <div className="flex flex-col gap-4">
          <TransactionFields
            categories={categories}
            monthStart={monthStart}
            todayIso={todayIso}
            transaction={transaction}
            pending={pending}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
          />

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>
      </FormScrollBody>

      <FormStickyFooter>
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={pending || !categoryId}
            className="min-h-11 w-full"
            data-testid={isEdit ? "save-transaction" : "add-transaction-submit"}
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add transaction"}
          </Button>
          {isEdit && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full text-destructive hover:text-destructive sm:hidden"
              disabled={pending}
              onClick={onDelete}
              data-testid={`delete-transaction-${transaction?.id}`}
            >
              Delete transaction
            </Button>
          ) : null}
        </div>
      </FormStickyFooter>
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
  onDelete,
}: TransactionFormDialogProps) {
  const formKey = open ? `${transaction?.id ?? "new"}-${monthStart}` : "closed";

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={transaction ? "Edit transaction" : "Add transaction"}
      description="Income categories count as money in; everything else is money out."
      stickyFooter
    >
      <TransactionForm
        key={formKey}
        categories={categories}
        monthStart={monthStart}
        todayIso={todayIso}
        transaction={transaction}
        onClose={() => onOpenChange(false)}
        onDelete={onDelete}
      />
    </ResponsiveFormShell>
  );
}
