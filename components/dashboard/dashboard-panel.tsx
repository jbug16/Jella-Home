import { BudgetExpenseChart } from "@/components/dashboard/budget-expense-chart";
import { CountdownsCard } from "@/components/dashboard/countdowns-card";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import { MealSummaryRow } from "@/components/meals/meal-summary-row";
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
            <li key={meal.id}>
              <MealSummaryRow
                href={mealHref(meal, asOf.weekStart)}
                title={meal.title}
                meta={meal.mealSlotLabel}
                imageUrl={meal.imageUrl}
                testId={`dashboard-meal-${meal.id}`}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </DashboardCardShell>
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
  return <DashboardGrid viewModel={viewModel} />;
}
