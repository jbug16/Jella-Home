"use client";

import { useMemo, useState } from "react";
import { Plus, SlidersHorizontal, Trash2, Wallet } from "lucide-react";

import { CreateCategoryDialog } from "@/components/budget/create-category-dialog";
import { DeleteCategoryDialog } from "@/components/budget/delete-category-dialog";
import { DeleteTransactionDialog } from "@/components/budget/delete-transaction-dialog";
import {
  BudgetPeriodNavigator,
  BudgetPeriodToggle,
} from "@/components/budget/budget-period-controls";
import { SetLimitDialog } from "@/components/budget/set-limit-dialog";
import { TransactionFormDialog } from "@/components/budget/transaction-form-dialog";
import { EmptyState } from "@/components/common/empty-state";
import {
  ListRowBody,
  ListRowButton,
  ListRowMeta,
  ListRowTitle,
  ListRowTrailing,
} from "@/components/common/list-row";
import { PeriodPanelHeader } from "@/components/common/panel-header";
import { PanelList, PanelListItem } from "@/components/common/panel-list";
import { PrimaryAddButton } from "@/components/common/primary-add-button";
import { RowEditDeleteActions } from "@/components/common/row-edit-delete-actions";
import {
  SummaryStat,
  SummaryStatGrid,
} from "@/components/common/summary-stat-grid";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Progress } from "@/components/ui/progress";
import { budgetCategoryVisual } from "@/lib/budget/category-visual";
import {
  formatCents,
  transactionAmountTone,
  type BudgetCategory,
  type BudgetCategoryKind,
  type BudgetMonthSnapshot,
  type BudgetPeriod,
  type BudgetYearSnapshot,
  type CategorySummary,
  type Transaction,
} from "@/lib/domain/budget";
import { formatIsoDateUs } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

type BudgetPanelProps = {
  period: BudgetPeriod;
  todayIso: string;
  categories: BudgetCategory[];
  categoryDisplayById: Record<
    string,
    { name: string; kind: BudgetCategoryKind }
  >;
  transactions: Transaction[];
  monthSnapshot?: BudgetMonthSnapshot;
  yearSnapshot?: BudgetYearSnapshot;
};

type BudgetView = "overview" | "transactions";

function ViewToggle({
  view,
  onChange,
}: {
  view: BudgetView;
  onChange: (view: BudgetView) => void;
}) {
  return (
    <div
      className="flex rounded-lg border p-1"
      role="tablist"
      aria-label="Budget views"
    >
      {(
        [
          ["overview", "Overview"],
          ["transactions", "Transactions"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={view === value}
          className={cn(
            "min-h-11 flex-1 rounded-md px-2 text-sm font-medium transition-colors sm:px-3",
            view === value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(value)}
          data-testid={`budget-view-${value}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function BudgetPanel({
  period,
  todayIso,
  categories,
  categoryDisplayById,
  transactions,
  monthSnapshot,
  yearSnapshot,
}: BudgetPanelProps) {
  const [view, setView] = useState<BudgetView>("overview");
  const [addOpen, setAddOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitCategoryId, setLimitCategoryId] = useState<string | undefined>();
  const [deletingCategory, setDeletingCategory] =
    useState<BudgetCategory | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const plannedDollarsByCategoryId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of monthSnapshot?.categorySummaries ?? []) {
      map[row.categoryId] = (row.plannedCents / 100).toFixed(2);
    }
    return map;
  }, [monthSnapshot]);

  const hasCategories = categories.length > 0;
  const monthStart =
    period.view === "month" ? period.monthStart : `${period.year}-01-01`;

  const spentValueClass = "text-destructive";
  const remainingValueClass =
    (monthSnapshot?.remainingOutCents ?? 0) < 0
      ? "text-destructive"
      : monthSnapshot?.remainingOutCents === 0
        ? "text-muted-foreground"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <div
      className="flex min-w-0 flex-col gap-3 overflow-x-hidden"
      data-testid="budget-panel"
    >
      <PeriodPanelHeader
        navigator={<BudgetPeriodNavigator period={period} />}
        actions={
          <div className="flex items-center gap-1">
            <BudgetPeriodToggle period={period} />
            <PrimaryAddButton
              label="Add transaction"
              onClick={() => setAddOpen(true)}
              disabled={categories.length === 0}
              data-testid="open-add-transaction"
            />
          </div>
        }
      />

      {!hasCategories ? (
        <EmptyState
          icon={Wallet}
          title="No categories yet"
          description="Add a category to start tracking."
        />
      ) : (
        <>
          <ViewToggle view={view} onChange={setView} />

          {view === "overview" && period.view === "month" && monthSnapshot ? (
            <section
              aria-labelledby="budget-summary-heading"
              className="space-y-3"
              data-testid="budget-summary"
            >
              <h2 id="budget-summary-heading" className="sr-only">
                This month
              </h2>

              <SummaryStatGrid headingId="budget-summary-heading">
                <SummaryStat
                  label="Planned"
                  value={formatCents(monthSnapshot.plannedTotalCents)}
                  testId="summary-planned"
                />
                <SummaryStat
                  label="Spent"
                  value={formatCents(monthSnapshot.actualOutCents)}
                  testId="summary-actual"
                  valueClassName={spentValueClass}
                />
                <SummaryStat
                  label="Remaining"
                  value={formatCents(monthSnapshot.remainingOutCents)}
                  testId="summary-remaining"
                  valueClassName={remainingValueClass}
                />
              </SummaryStatGrid>

              <PanelList>
                {monthSnapshot.categorySummaries.map((row) => (
                  <CategoryRow
                    key={row.categoryId}
                    row={row}
                    testId={`category-row-${row.kind}-${row.name}`}
                    onSetLimit={() => {
                      setLimitCategoryId(row.categoryId);
                      setLimitOpen(true);
                    }}
                    onDelete={() => {
                      const category = categoryById.get(row.categoryId);
                      if (category) {
                        setDeletingCategory(category);
                      }
                    }}
                  />
                ))}
              </PanelList>

              <Button
                type="button"
                variant="ghost"
                className="min-h-11 w-full text-muted-foreground"
                onClick={() => setCategoryOpen(true)}
                data-testid="open-create-category"
              >
                <Plus className="size-4" aria-hidden />
                Add category
              </Button>
            </section>
          ) : view === "overview" && yearSnapshot ? (
            <section
              className="space-y-3"
              aria-labelledby="budget-year-summary-heading"
              data-testid="budget-year-summary"
            >
              <h2 id="budget-year-summary-heading" className="sr-only">
                This year
              </h2>
              <SummaryStatGrid headingId="budget-year-summary-heading">
                <SummaryStat
                  label="Spending"
                  value={formatCents(yearSnapshot.spendingCents)}
                  testId="summary-year-spending"
                  valueClassName="text-destructive"
                />
                <SummaryStat
                  label="Income"
                  value={formatCents(yearSnapshot.incomeCents)}
                  testId="summary-year-income"
                  valueClassName="text-emerald-600"
                />
                <SummaryStat
                  label="Saved"
                  value={formatCents(yearSnapshot.savingsCents)}
                  testId="summary-year-savings"
                />
              </SummaryStatGrid>
              <h2 className="text-base font-semibold">By category</h2>
              <PanelList testId="year-category-list">
                {yearSnapshot.categorySummaries.map((row) => (
                  <YearCategoryRow
                    key={row.categoryId}
                    row={row}
                    testId={`category-row-${row.kind}-${row.name}`}
                  />
                ))}
              </PanelList>
            </section>
          ) : view === "transactions" ? (
            <section aria-labelledby="transactions-heading">
              <h2 id="transactions-heading" className="sr-only">
                Transactions
              </h2>
              {transactions.length === 0 ? (
                <p
                  className="py-8 text-center text-sm text-muted-foreground"
                  data-testid="transactions-empty"
                >
                  No transactions{" "}
                  {period.view === "month" ? "this month" : `in ${period.year}`}
                  .
                </p>
              ) : (
                <PanelList testId="transactions-list">
                  {transactions.map((transaction) => {
                    const display = categoryDisplayById[transaction.categoryId];
                    const category = categoryById.get(transaction.categoryId);
                    const categoryKind = display?.kind ?? category?.kind;
                    const categoryName = display?.name ?? category?.name;
                    const amountTone = transactionAmountTone(
                      categoryKind,
                      transaction.direction,
                    );
                    return (
                      <PanelListItem
                        key={transaction.id}
                        testId={`transaction-row-${transaction.id}`}
                      >
                        <ListRowButton
                          onClick={() => setEditing(transaction)}
                          testId={`edit-transaction-${transaction.id}`}
                          className="items-center justify-between gap-3"
                        >
                          <ListRowBody>
                            <ListRowTitle>
                              {categoryName ?? "Category"}
                            </ListRowTitle>
                            <ListRowMeta>
                              <time dateTime={transaction.occurredOn}>
                                {formatIsoDateUs(transaction.occurredOn)}
                              </time>
                              {transaction.payee
                                ? ` · ${transaction.payee}`
                                : null}
                            </ListRowMeta>
                          </ListRowBody>
                          <ListRowTrailing
                            className={cn(
                              amountTone === "income" &&
                                "text-emerald-600 dark:text-emerald-400",
                              amountTone === "spending" && "text-destructive",
                            )}
                          >
                            {transaction.direction === "out" ? "−" : "+"}
                            {formatCents(transaction.amountCents)}
                          </ListRowTrailing>
                        </ListRowButton>
                        <RowEditDeleteActions
                          className="hidden shrink-0 pr-3 sm:flex"
                          onEdit={() => setEditing(transaction)}
                          onDelete={() => setDeleting(transaction)}
                          editLabel="Edit transaction"
                          deleteLabel="Delete transaction"
                          deleteTestId={`delete-transaction-${transaction.id}`}
                        />
                      </PanelListItem>
                    );
                  })}
                </PanelList>
              )}
            </section>
          ) : null}
        </>
      )}

      {!hasCategories ? (
        <Button
          type="button"
          className="min-h-11"
          onClick={() => setCategoryOpen(true)}
          data-testid="open-create-category"
        >
          Add category
        </Button>
      ) : null}

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
      <DeleteCategoryDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategory(null);
          }
        }}
        category={deletingCategory}
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
        onDelete={() => {
          if (editing) {
            setDeleting(editing);
            setEditing(null);
          }
        }}
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

function YearCategoryRow({
  row,
  testId,
}: {
  row: BudgetYearSnapshot["categorySummaries"][number];
  testId: string;
}) {
  const visual = budgetCategoryVisual(row.name, row.kind);
  const Icon = visual.icon;

  return (
    <li
      className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
      data-testid={testId}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          visual.chipClassName,
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <p className="min-w-0 flex-1 truncate font-medium">{row.name}</p>
      <p className="shrink-0 text-sm font-medium tabular-nums">
        {formatCents(row.actualCents)}
      </p>
    </li>
  );
}

function CategoryRow({
  row,
  testId,
  onSetLimit,
  onDelete,
}: {
  row: CategorySummary;
  testId: string;
  onSetLimit: () => void;
  onDelete: () => void;
}) {
  const visual = budgetCategoryVisual(row.name, row.kind);
  const Icon = visual.icon;
  const isIncome = row.kind === "income";
  const percent =
    row.plannedCents > 0
      ? Math.min(100, Math.round((row.actualCents / row.plannedCents) * 100))
      : 0;
  const over = row.remainingCents < 0;

  return (
    <li
      className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
      data-testid={testId}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg sm:mt-0",
          visual.chipClassName,
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <p className="truncate font-medium">{row.name}</p>
          <p
            className={cn(
              "shrink-0 text-sm tabular-nums",
              isIncome
                ? "text-foreground"
                : over
                  ? "text-destructive"
                  : row.plannedCents > 0
                    ? "text-muted-foreground"
                    : "text-destructive",
            )}
          >
            {isIncome
              ? formatCents(row.actualCents)
              : over
                ? formatCents(Math.abs(row.remainingCents))
                : row.plannedCents > 0
                  ? `${formatCents(row.remainingCents)} left`
                  : formatCents(row.actualCents)}
          </p>
        </div>
        {!isIncome && row.plannedCents > 0 ? (
          <Progress
            value={percent}
            aria-label={`${row.name}: ${percent}% of planned`}
            className={cn(
              "mt-1.5 h-1",
              over && "[&_[data-slot=progress-indicator]]:bg-destructive",
            )}
          />
        ) : null}
      </div>
      <div className="hidden shrink-0 gap-0.5 sm:flex">
        <IconButton
          label="Set limit"
          variant="ghost"
          onClick={onSetLimit}
          data-testid={`set-limit-${row.name}`}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </IconButton>
        <IconButton
          label="Delete category"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          data-testid={`delete-category-${row.name}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </IconButton>
      </div>
    </li>
  );
}
