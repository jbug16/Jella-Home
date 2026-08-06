"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createCategoryAction,
  type BudgetActionState,
} from "@/app/(app)/budget/actions";
import {
  FormError,
  FormScrollBody,
  FormStickyFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
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
import { budgetCategoryKindSchema } from "@/lib/domain/budget";

const initialState: BudgetActionState = { error: null, success: null };

const KIND_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  bill: "Bill",
  savings: "Savings",
  debt: "Debt",
};

type CreateCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CreateCategoryFormProps = {
  onClose: () => void;
};

function CreateCategoryForm({ onClose }: CreateCategoryFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createCategoryAction,
    initialState,
  );
  const [kind, setKind] = useState("expense");

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="kind" value={kind} />
      <FormScrollBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              disabled={pending}
              className="min-h-11"
              placeholder="Food"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="kind">Type</Label>
            <Select value={kind} onValueChange={setKind} disabled={pending}>
              <SelectTrigger id="kind" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {budgetCategoryKindSchema.options.map((value) => (
                  <SelectItem key={value} value={value}>
                    {KIND_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormError message={state.error} />
        </div>
      </FormScrollBody>

      <FormStickyFooter>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="touch"
            disabled={pending}
            className="min-h-11 w-full"
            data-testid="create-category-submit"
          >
            {pending ? "Saving…" : "Add category"}
          </Button>
        </div>
      </FormStickyFooter>
    </form>
  );
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
}: CreateCategoryDialogProps) {
  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add category"
      description="Categories group planned limits and transactions."
    >
      <CreateCategoryForm
        key={open ? "open" : "closed"}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveFormShell>
  );
}
