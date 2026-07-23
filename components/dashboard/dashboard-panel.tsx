import Link from "next/link";

import { CalendarDayView } from "@/components/calendar/day-view";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import { Progress } from "@/components/ui/progress";
import { formatCents } from "@/lib/domain/budget";
import type { DashboardViewModel } from "@/lib/domain/dashboard";
import { cn } from "@/lib/utils";

type DashboardPanelProps = {
  viewModel: DashboardViewModel;
};

function mealsHref(weekStart: string): string {
  return `/meals?week=${weekStart}`;
}

function budgetHref(monthStart: string): string {
  return `/budget?month=${monthStart.slice(0, 7)}`;
}

function mealHref(
  meal: DashboardViewModel["todayMeals"][number],
  weekStart: string,
): string {
  if (meal.recipeId) {
    return `/recipes/${meal.recipeId}`;
  }
  return mealsHref(weekStart);
}

function BudgetCard({ viewModel }: DashboardPanelProps) {
  const { budget } = viewModel;
  const href = budgetHref(budget.monthStart);

  const remainingClass =
    budget.remainingTone === "danger"
      ? "text-destructive"
      : budget.remainingTone === "ok"
        ? "text-foreground"
        : "text-muted-foreground";

  return (
    <DashboardCardShell
      id="card-budget"
      title="Budget"
      description="This month"
      actionHref={href}
      actionLabel="View budget"
      actionTestId="dashboard-cta-budget"
      className="min-h-0 shrink-0"
      compact
    >
      {!budget.hasBudgetSetup ? (
        <p className="text-sm text-muted-foreground">
          Set monthly limits in Budget to track what&apos;s left.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div>
            <p
              className={cn(
                "text-xl font-semibold tracking-tight tabular-nums",
                remainingClass,
              )}
              data-testid="dashboard-budget-remaining"
            >
              {budget.remainingLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Spent {formatCents(budget.actualOutCents)} of{" "}
              {formatCents(budget.plannedTotalCents)} planned
            </p>
          </div>
          <div
            className="flex flex-col gap-1.5"
            role="status"
            data-testid="dashboard-budget-progress"
          >
            <Progress
              value={budget.spendingProgressPercent}
              aria-hidden="true"
            />
            <p className="sr-only">
              Spending progress: {budget.spendingProgressPercent} percent of
              planned budget used. {budget.remainingLabel}.
            </p>
          </div>
        </div>
      )}

      {budget.recentTransactions.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-2">
          {budget.recentTransactions.map((txn) => (
            <li
              key={txn.id}
              className="flex items-baseline justify-between gap-3 text-sm"
              data-testid="dashboard-recent-txn"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{txn.payee}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {txn.categoryName}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {txn.direction === "out" ? "−" : "+"}
                {formatCents(txn.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      ) : budget.hasBudgetSetup ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No transactions this month yet.
        </p>
      ) : null}
    </DashboardCardShell>
  );
}

function TodaysMealsCard({ viewModel }: DashboardPanelProps) {
  const { todayMeals, asOf } = viewModel;
  const planHref = mealsHref(asOf.weekStart);

  return (
    <DashboardCardShell
      id="card-meals"
      title="Today's meals"
      description="From meal planning"
      actionHref={planHref}
      actionLabel="Open planner"
      actionTestId="dashboard-cta-meals"
      className="min-h-0 sidebar:flex-1"
      compact
      scrollBody
    >
      {todayMeals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing planned to eat today.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="dashboard-today-meals">
          {todayMeals.map((meal) => (
            <li key={meal.id}>
              <Link
                href={mealHref(meal, asOf.weekStart)}
                className="flex min-h-14 items-center gap-3 rounded-xl p-1.5 pr-3 transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid={`dashboard-meal-${meal.id}`}
              >
                <MealCover title={meal.title} imageUrl={meal.imageUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold leading-snug text-foreground">
                    {meal.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {meal.mealSlotLabel}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}

function MealCover({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    return (
      <span
        className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs */}
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          data-testid="dashboard-meal-thumbnail"
        />
      </span>
    );
  }

  return (
    <span
      className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tracking-wide text-muted-foreground ring-1 ring-border/60"
      aria-hidden
      data-testid="dashboard-meal-thumbnail-placeholder"
      title={`${title} has no photo`}
    >
      {title.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

/** Presentational Dashboard — fills the desktop viewport without page scroll. */
export function DashboardPanel({ viewModel }: DashboardPanelProps) {
  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-1 gap-4 sidebar:grid-cols-[minmax(0,1.55fr)_minmax(20rem,1fr)] sidebar:gap-5"
      data-testid="dashboard-panel"
    >
      <CalendarDayView
        day={viewModel.today}
        heading="Today's events"
        actionHref="/calendar"
        actionLabel="Open calendar"
        actionTestId="dashboard-cta-today"
        fillHeight
        className="min-h-[20rem] sidebar:min-h-0"
      />
      <div className="flex min-h-0 flex-col gap-4 sidebar:overflow-hidden">
        <TodaysMealsCard viewModel={viewModel} />
        <BudgetCard viewModel={viewModel} />
      </div>
    </div>
  );
}
