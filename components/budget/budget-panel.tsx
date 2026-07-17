"use client";

import { useMemo, useState } from "react";

import { CreateCategoryDialog } from "@/components/budget/create-category-dialog";
import { DeleteTransactionDialog } from "@/components/budget/delete-transaction-dialog";
import { MonthNavigator } from "@/components/budget/month-navigator";
import { SetLimitDialog } from "@/components/budget/set-limit-dialog";
import { TransactionFormDialog } from "@/components/budget/transaction-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCents,
  type BudgetCategory,
  type BudgetMonthSnapshot,
  type Transaction,
} from "@/lib/domain/budget";

const KIND_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expenses",
  bill: "Bills",
  savings: "Savings",
  debt: "Debt",
};

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

      <section aria-labelledby="budget-summary-heading" className="space-y-3">
        <h2 id="budget-summary-heading" className="text-lg font-semibold">
          This month
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryStat
            label="Planned spending"
            value={formatCents(snapshot.plannedTotalCents)}
            testId="summary-planned"
          />
          <SummaryStat
            label="Actual spending"
            value={formatCents(snapshot.actualOutCents)}
            testId="summary-actual"
          />
          <SummaryStat
            label="Remaining"
            value={formatCents(snapshot.remainingOutCents, { signed: true })}
            testId="summary-remaining"
            tone={
              snapshot.remainingOutCents < 0
                ? "danger"
                : snapshot.remainingOutCents === 0
                  ? "muted"
                  : "ok"
            }
          />
        </div>
        <p
          className="text-sm text-muted-foreground"
          data-testid="summary-income"
        >
          Income received: {formatCents(snapshot.actualInCents)}
        </p>
      </section>

      <section aria-labelledby="kind-summary-heading" className="space-y-3">
        <h2 id="kind-summary-heading" className="text-lg font-semibold">
          By type
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {snapshot.kindSummaries.map((row) => (
            <Card key={row.kind}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {KIND_LABELS[row.kind] ?? row.kind}
                </CardTitle>
                <CardDescription>
                  Planned {formatCents(row.plannedCents)} · Actual{" "}
                  {formatCents(row.actualCents)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p
                  className={
                    row.remainingCents < 0
                      ? "text-sm font-medium text-destructive"
                      : "text-sm font-medium"
                  }
                  data-testid={`kind-remaining-${row.kind}`}
                >
                  Remaining {formatCents(row.remainingCents, { signed: true })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="category-summary-heading" className="space-y-3">
        <h2 id="category-summary-heading" className="text-lg font-semibold">
          Categories
        </h2>
        {snapshot.categorySummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add a category to start planning.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {snapshot.categorySummaries.map((row) => (
              <li
                key={row.categoryId}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`category-row-${row.kind}-${row.name}`}
              >
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {KIND_LABELS[row.kind] ?? row.kind}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="text-sm sm:text-right">
                    <p>
                      Planned {formatCents(row.plannedCents)} · Actual{" "}
                      {formatCents(row.actualCents)}
                    </p>
                    <p
                      className={
                        row.remainingCents < 0
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      Remaining{" "}
                      {formatCents(row.remainingCents, { signed: true })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-fit"
                    onClick={() => {
                      setLimitCategoryId(row.categoryId);
                      setLimitOpen(true);
                    }}
                    data-testid={`set-limit-${row.name}`}
                  >
                    Set limit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="transactions-heading" className="space-y-3">
        <h2 id="transactions-heading" className="text-lg font-semibold">
          Transactions
        </h2>
        {transactions.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="transactions-empty"
          >
            No transactions this month.
          </p>
        ) : (
          <ul
            className="divide-y rounded-lg border"
            data-testid="transactions-list"
          >
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`transaction-row-${transaction.id}`}
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {formatCents(transaction.amountCents)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {transaction.direction === "in" ? "in" : "out"}
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {categoryNameById.get(transaction.categoryId) ?? "Category"}{" "}
                    · {transaction.occurredOn}
                    {transaction.payee ? ` · ${transaction.payee}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setEditing(transaction)}
                    data-testid={`edit-transaction-${transaction.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setDeleting(transaction)}
                    data-testid={`delete-transaction-${transaction.id}`}
                  >
                    Delete
                  </Button>
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

function SummaryStat({
  label,
  value,
  testId,
  tone = "muted",
}: {
  label: string;
  value: string;
  testId: string;
  tone?: "muted" | "ok" | "danger";
}) {
  const valueClass =
    tone === "danger"
      ? "text-2xl font-semibold tracking-tight text-destructive"
      : tone === "ok"
        ? "text-2xl font-semibold tracking-tight text-foreground"
        : "text-2xl font-semibold tracking-tight";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={valueClass} data-testid={testId}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
