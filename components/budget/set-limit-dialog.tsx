"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  upsertMonthLimitAction,
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
import type { BudgetCategory } from "@/lib/domain/budget";

const initialState: BudgetActionState = { error: null, success: null };

type SetLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  monthStart: string;
  initialCategoryId?: string;
  plannedDollarsByCategoryId: Record<string, string>;
};

type SetLimitFormProps = Omit<SetLimitDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
};

function SetLimitForm({
  categories,
  monthStart,
  initialCategoryId,
  plannedDollarsByCategoryId,
  onClose,
}: SetLimitFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    upsertMonthLimitAction,
    initialState,
  );
  const startingCategoryId = initialCategoryId ?? categories[0]?.id ?? "";
  const [categoryId, setCategoryId] = useState(startingCategoryId);
  const [limitDollars, setLimitDollars] = useState(
    plannedDollarsByCategoryId[startingCategoryId] ?? "0.00",
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="monthStart" value={monthStart} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <FormScrollBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="limit-category">Category</Label>
            <select
              id="limit-category"
              className="min-h-11 rounded-md border border-input bg-background px-3"
              value={categoryId}
              onChange={(event) => {
                const nextId = event.target.value;
                setCategoryId(nextId);
                setLimitDollars(plannedDollarsByCategoryId[nextId] ?? "0.00");
              }}
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
              value={limitDollars}
              onChange={(event) => setLimitDollars(event.target.value)}
              placeholder="500.00"
              className="min-h-11"
            />
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
            disabled={pending || !categoryId}
            className="min-h-11 w-full"
            data-testid="save-month-limit"
          >
            {pending ? "Saving…" : "Save limit"}
          </Button>
        </div>
      </FormStickyFooter>
    </form>
  );
}

export function SetLimitDialog({
  open,
  onOpenChange,
  categories,
  monthStart,
  initialCategoryId,
  plannedDollarsByCategoryId,
}: SetLimitDialogProps) {
  const formKey = open
    ? `${initialCategoryId ?? "first"}-${monthStart}-${Object.keys(plannedDollarsByCategoryId).join(",")}`
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
        plannedDollarsByCategoryId={plannedDollarsByCategoryId}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveFormShell>
  );
}
