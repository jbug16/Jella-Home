"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  upsertMonthLimitAction,
  type BudgetActionState,
} from "@/app/(app)/budget/actions";
import { ResponsiveFormShell } from "@/components/budget/responsive-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BudgetCategory } from "@/lib/domain/budget";

const initialState: BudgetActionState = { error: null, success: null };

type SetLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  monthStart: string;
  initialCategoryId?: string;
  initialLimitDollars?: string;
};

type SetLimitFormProps = Omit<SetLimitDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
};

function SetLimitForm({
  categories,
  monthStart,
  initialCategoryId,
  initialLimitDollars = "",
  onClose,
}: SetLimitFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    upsertMonthLimitAction,
    initialState,
  );
  const [categoryId, setCategoryId] = useState(
    initialCategoryId ?? categories[0]?.id ?? "",
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="monthStart" value={monthStart} />
      <input type="hidden" name="categoryId" value={categoryId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="limit-category">Category</Label>
        <select
          id="limit-category"
          className="min-h-11 rounded-md border border-input bg-background px-3"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={pending}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.kind})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="limitDollars">Planned amount</Label>
        <Input
          id="limitDollars"
          name="limitDollars"
          inputMode="decimal"
          required
          disabled={pending}
          defaultValue={initialLimitDollars}
          placeholder="500.00"
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
        data-testid="save-month-limit"
      >
        {pending ? "Saving…" : "Save limit"}
      </Button>
    </form>
  );
}

export function SetLimitDialog({
  open,
  onOpenChange,
  categories,
  monthStart,
  initialCategoryId,
  initialLimitDollars = "",
}: SetLimitDialogProps) {
  const formKey = open
    ? `${initialCategoryId ?? ""}-${monthStart}-${initialLimitDollars}`
    : "closed";

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title="Set monthly limit"
      description="Planned amount for this category in the selected month."
    >
      <SetLimitForm
        key={formKey}
        categories={categories}
        monthStart={monthStart}
        initialCategoryId={initialCategoryId}
        initialLimitDollars={initialLimitDollars}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveFormShell>
  );
}
