"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { CreateCategoryDialog } from "@/components/budget/create-category-dialog";
import { DeleteTransactionDialog } from "@/components/budget/delete-transaction-dialog";
import { MonthNavigator } from "@/components/budget/month-navigator";
import { SetLimitDialog } from "@/components/budget/set-limit-dialog";
import { TransactionFormDialog } from "@/components/budget/transaction-form-dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Progress } from "@/components/ui/progress";
import {
  formatCents,
  type BudgetCategory,
  type BudgetMonthSnapshot,
  type Transaction,
} from "@/lib/domain/budget";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expenses",
  bill: "Bills",
  savings: "Savings",
  debt: "Debt",
};

/** Categories at or above this share of planned spend need attention. */
const ATTENTION_RATIO = 0.85;

type BudgetPanelProps = {
  monthStart: string;
  todayIso: string;
  categories: BudgetCategory[];
  transactions: Transaction[];
  snapshot: BudgetMonthSnapshot;
};

export function BudgetPanel({
  monthStart,
  todayIso,
  categories,
  transactions,
  snapshot,
}: BudgetPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitCategoryId, setLimitCategoryId] = useState<string | undefined>();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const plannedDollarsByCategoryId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of snapshot.categorySummaries) {
      map[row.categoryId] = (row.plannedCents / 100).toFixed(2);
    }
    return map;
  }, [snapshot.categorySummaries]);

  const spendingCategories = useMemo(() => {
    return snapshot.categorySummaries.filter((row) => row.kind !== "income");
  }, [snapshot.categorySummaries]);

  const attentionCategories = useMemo(() => {
    return spendingCategories.filter((row) => {
      if (row.plannedCents <= 0) {
        return row.actualCents > 0;
      }
      return row.actualCents / row.plannedCents >= ATTENTION_RATIO;
    });
  }, [spendingCategories]);

  const remainingTone =
    snapshot.remainingOutCents < 0
      ? "danger"
      : snapshot.remainingOutCents === 0
        ? "muted"
        : "ok";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigator monthStart={monthStart} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setCategoryOpen(true)}
            data-testid="open-create-category"
          >
            Add category
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setLimitCategoryId(undefined);
              setLimitOpen(true);
            }}
            disabled={categories.length === 0}
            data-testid="open-set-limit"
          >
            Set limit
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => setAddOpen(true)}
            disabled={categories.length === 0}
            data-testid="open-add-transaction"
          >
            Add transaction
          </Button>
        </div>
      </div>

      <section
        aria-labelledby="budget-summary-heading"
        className="space-y-4"
        data-testid="budget-summary"
      >
        <div className="flex flex-col gap-1">
          <h2 id="budget-summary-heading" className="sr-only">
            This month
          </h2>
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p
            className={cn(
              "text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl",
              remainingTone === "danger" && "text-destructive",
              remainingTone === "muted" && "text-muted-foreground",
            )}
            data-testid="summary-remaining"
          >
            {formatCents(snapshot.remainingOutCents, { signed: true })}
          </p>
          <p
            className="text-sm text-muted-foreground"
            data-testid="summary-income"
          >
            Income received: {formatCents(snapshot.actualInCents)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Planned</p>
            <p
              className="mt-1 text-lg font-semibold tabular-nums tracking-tight"
              data-testid="summary-planned"
            >
              {formatCents(snapshot.plannedTotalCents)}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p
              className="mt-1 text-lg font-semibold tabular-nums tracking-tight"
              data-testid="summary-actual"
            >
              {formatCents(snapshot.actualOutCents)}
            </p>
          </div>
        </div>
      </section>

      {attentionCategories.length > 0 ? (
        <section
          aria-labelledby="budget-attention-heading"
          className="space-y-3"
          data-testid="budget-attention"
        >
          <h2
            id="budget-attention-heading"
            className="text-base font-semibold tracking-tight"
          >
            Needs attention
          </h2>
          <ul className="flex flex-col gap-2">
            {attentionCategories.map((row) => (
              <CategoryProgressRow
                key={row.categoryId}
                name={row.name}
                kindLabel={KIND_LABELS[row.kind] ?? row.kind}
                plannedCents={row.plannedCents}
                actualCents={row.actualCents}
                remainingCents={row.remainingCents}
                testId={`attention-row-${row.kind}-${row.name}`}
                onSetLimit={() => {
                  setLimitCategoryId(row.categoryId);
                  setLimitOpen(true);
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="category-summary-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="category-summary-heading"
            className="text-base font-semibold tracking-tight"
          >
            Categories
          </h2>
          <p className="text-xs text-muted-foreground">
            Planned vs spent this month
          </p>
        </div>
        {snapshot.categorySummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add a category to start planning.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {snapshot.categorySummaries.map((row) => (
              <CategoryProgressRow
                key={row.categoryId}
                name={row.name}
                kindLabel={KIND_LABELS[row.kind] ?? row.kind}
                plannedCents={row.plannedCents}
                actualCents={row.actualCents}
                remainingCents={row.remainingCents}
                testId={`category-row-${row.kind}-${row.name}`}
                onSetLimit={() => {
                  setLimitCategoryId(row.categoryId);
                  setLimitOpen(true);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="transactions-heading" className="space-y-3">
        <h2
          id="transactions-heading"
          className="text-base font-semibold tracking-tight"
        >
          Recent activity
        </h2>
        {transactions.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="transactions-empty"
          >
            No transactions this month. Add one to update what&apos;s left.
          </p>
        ) : (
          <ul
            className="divide-y rounded-xl border border-border/80"
            data-testid="transactions-list"
          >
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center gap-3 px-3 py-3 sm:px-4"
                data-testid={`transaction-row-${transaction.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium tabular-nums">
                    {transaction.direction === "out" ? "−" : "+"}
                    {formatCents(transaction.amountCents)}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {categoryNameById.get(transaction.categoryId) ?? "Category"}
                    {" · "}
                    {transaction.occurredOn}
                    {transaction.payee ? ` · ${transaction.payee}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton
                    label="Edit transaction"
                    variant="ghost"
                    onClick={() => setEditing(transaction)}
                    data-testid={`edit-transaction-${transaction.id}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label="Delete transaction"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(transaction)}
                    data-testid={`delete-transaction-${transaction.id}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CreateCategoryDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
      />
      <SetLimitDialog
        open={limitOpen}
        onOpenChange={setLimitOpen}
        categories={categories}
        monthStart={monthStart}
        initialCategoryId={limitCategoryId}
        plannedDollarsByCategoryId={plannedDollarsByCategoryId}
      />
      <TransactionFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        monthStart={monthStart}
        todayIso={todayIso}
      />
      <TransactionFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        categories={categories}
        monthStart={monthStart}
        todayIso={todayIso}
        transaction={editing}
      />
      <DeleteTransactionDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        transaction={deleting}
      />
    </div>
  );
}

function CategoryProgressRow({
  name,
  kindLabel,
  plannedCents,
  actualCents,
  remainingCents,
  testId,
  onSetLimit,
}: {
  name: string;
  kindLabel: string;
  plannedCents: number;
  actualCents: number;
  remainingCents: number;
  testId: string;
  onSetLimit: () => void;
}) {
  const percent =
    plannedCents > 0
      ? Math.min(100, Math.round((actualCents / plannedCents) * 100))
      : actualCents > 0
        ? 100
        : 0;
  const over = remainingCents < 0;

  return (
    <li
      className="rounded-xl border border-border/80 px-3 py-3 sm:px-4"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{kindLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium tabular-nums",
              over ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {over
              ? `${formatCents(Math.abs(remainingCents))} over`
              : `${formatCents(remainingCents)} left`}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 px-2"
            onClick={onSetLimit}
            data-testid={`set-limit-${name}`}
          >
            Set limit
          </Button>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <Progress
          value={percent}
          aria-label={`${name}: ${percent}% of planned`}
          className={cn(
            over && "[&_[data-slot=progress-indicator]]:bg-destructive",
          )}
        />
        <p className="text-xs text-muted-foreground tabular-nums">
          Spent {formatCents(actualCents)}
          {plannedCents > 0 ? ` of ${formatCents(plannedCents)} planned` : ""}
        </p>
      </div>
    </li>
  );
}
