import Link from "next/link";

import { CalendarDayView } from "@/components/calendar/day-view";
import { BudgetExpenseChart } from "@/components/dashboard/budget-expense-chart";
import { CountdownsCard } from "@/components/dashboard/countdowns-card";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import { formatCents } from "@/lib/domain/budget";
import type { DashboardViewModel } from "@/lib/domain/dashboard";
import { CALENDAR_ENABLED } from "@/lib/features/calendar";
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

function BudgetCard({
  viewModel,
  className,
}: DashboardPanelProps & { className?: string }) {
  const { budget } = viewModel;
  const href = budgetHref(budget.monthStart);

  return (
    <DashboardCardShell
      id="card-budget"
      title="Budget"
      href={href}
      linkLabel="View budget"
      linkTestId="dashboard-cta-budget"
      className={cn("min-h-0 shrink-0", className)}
      compact
    >
      <BudgetExpenseChart
        slices={budget.expenseSlices}
        totalOutCents={budget.actualOutCents}
        remainingLabel={
          budget.hasBudgetSetup ? budget.remainingLabel : undefined
        }
        remainingTone={budget.remainingTone}
      />
      {budget.hasBudgetSetup ? (
        <p
          className="sr-only"
          role="status"
          data-testid="dashboard-budget-progress"
        >
          Spending progress: {budget.spendingProgressPercent} percent of planned
          budget used. Spent {formatCents(budget.actualOutCents)} of{" "}
          {formatCents(budget.plannedTotalCents)} planned.{" "}
          {budget.remainingLabel}.
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
      href={planHref}
      linkLabel="Open meal planner"
      linkTestId="dashboard-cta-meals"
      className="min-h-0 self-start"
      compact
      scrollBody
    >
      {todayMeals.length > 0 ? (
        <ul className="flex flex-col gap-1" data-testid="dashboard-today-meals">
          {todayMeals.map((meal) => (
            <li key={meal.id} className="relative z-20">
              <Link
                href={mealHref(meal, asOf.weekStart)}
                className="flex min-h-11 items-center gap-2.5 rounded-lg p-1 pr-2 transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-14 sm:gap-3 sm:p-1.5 sm:pr-3"
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
      ) : null}
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
        className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60 sm:size-14 sm:rounded-lg"
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
      className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tracking-wide text-muted-foreground ring-1 ring-border/60 sm:size-14 sm:rounded-lg"
      aria-hidden
      data-testid="dashboard-meal-thumbnail-placeholder"
      title={`${title} has no photo`}
    >
      {title.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

function DashboardGrid({ viewModel }: DashboardPanelProps) {
  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sidebar:grid-cols-2 sidebar:grid-rows-[auto_1fr] sidebar:items-start sidebar:gap-4"
      data-testid="dashboard-panel"
    >
      <TodaysMealsCard viewModel={viewModel} />
      <BudgetCard viewModel={viewModel} />
      <div className="sidebar:col-start-2 sidebar:row-start-2">
        <CountdownsCard countdowns={viewModel.countdowns} />
      </div>
    </div>
  );
}

/** Presentational Dashboard — fills the desktop viewport without page scroll. */
export function DashboardPanel({ viewModel }: DashboardPanelProps) {
  if (!CALENDAR_ENABLED || !viewModel.today) {
    return <DashboardGrid viewModel={viewModel} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 sidebar:overflow-hidden">
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sidebar:grid-cols-2 sidebar:grid-rows-[auto_1fr] sidebar:items-start sidebar:gap-4 sidebar:overflow-hidden"
        data-testid="dashboard-panel"
      >
        <BudgetCard
          viewModel={viewModel}
          className="order-1 sidebar:order-none sidebar:col-start-2 sidebar:row-start-1"
        />
        <div className="order-2 flex min-h-0 flex-col gap-2.5 self-start sidebar:order-none sidebar:col-start-1 sidebar:row-start-1 sidebar:gap-4 sidebar:overflow-hidden">
          <TodaysMealsCard viewModel={viewModel} />
          <CalendarDayView
            day={viewModel.today}
            heading="Today"
            actionHref="/calendar"
            actionLabel="Open calendar"
            actionTestId="dashboard-cta-today"
            compact
            className="order-4 sidebar:order-none"
          />
        </div>
        <div className="order-3 sidebar:order-none sidebar:col-start-2 sidebar:row-start-2">
          <CountdownsCard countdowns={viewModel.countdowns} />
        </div>
      </div>
    </div>
  );
}
