import { formatCents } from "@/lib/domain/budget";
import type { DashboardExpenseSlice } from "@/lib/domain/dashboard";
import { budgetCategoryVisual } from "@/lib/budget/category-visual";
import { cn } from "@/lib/utils";

type BudgetExpenseChartProps = {
  slices: DashboardExpenseSlice[];
  totalOutCents: number;
  remainingLabel?: string;
  remainingTone?: "ok" | "danger" | "muted";
  showLegend?: boolean;
};

function buildDonutGradient(slices: DashboardExpenseSlice[]): string {
  if (slices.length === 0) {
    return "conic-gradient(#e2e8f0 0deg 360deg)";
  }
  if (slices.length === 1) {
    const color = budgetCategoryVisual(
      slices[0]!.name,
      slices[0]!.kind,
    ).chartColor;
    return `conic-gradient(from -90deg, ${color} 0deg 360deg)`;
  }

  let cursor = 0;
  const stops: string[] = [];
  for (const slice of slices) {
    const color = budgetCategoryVisual(slice.name, slice.kind).chartColor;
    const start = cursor * 3.6;
    cursor += slice.sharePercent;
    const end = cursor * 3.6;
    stops.push(`${color} ${start}deg ${end}deg`);
  }
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

export function BudgetExpenseChart({
  slices,
  totalOutCents,
  remainingLabel,
  remainingTone = "muted",
  showLegend = true,
}: BudgetExpenseChartProps) {
  const ariaLabel =
    slices.length > 0
      ? `Spending by category: ${slices.map((slice) => `${slice.name} ${formatCents(slice.amountCents)}`).join(", ")}`
      : "No spending this month";

  const remainingClass =
    remainingTone === "danger"
      ? "text-destructive"
      : remainingTone === "ok"
        ? "text-foreground"
        : "text-muted-foreground";

  return (
    <div
      className="flex w-full min-w-0 items-center gap-2 sm:gap-3"
      data-testid="dashboard-budget-chart"
    >
      <div
        className="relative size-[7.5rem] shrink-0 sm:size-40 md:size-44"
        role="img"
        aria-label={ariaLabel}
      >
        <div
          className="absolute inset-1 rounded-full"
          style={{ background: buildDonutGradient(slices) }}
          data-testid="dashboard-budget-donut"
        />

        <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-card px-0.5 text-center shadow-sm ring-1 ring-border/60 sm:inset-3 sm:px-1.5">
          <span className="text-[0.55rem] font-medium uppercase tracking-wider text-muted-foreground sm:text-[0.6rem]">
            Spent
          </span>
          <span
            className="text-base font-bold tabular-nums tracking-tight sm:text-xl md:text-2xl"
            data-testid="dashboard-budget-spent"
          >
            {formatCents(totalOutCents)}
          </span>
          {remainingLabel ? (
            <span
              className={cn(
                "mt-0.5 max-w-full truncate px-0.5 text-center text-[0.6rem] font-semibold tabular-nums leading-tight sm:max-w-[6rem] sm:text-[0.65rem]",
                remainingClass,
              )}
              data-testid="dashboard-budget-remaining"
            >
              {remainingLabel}
            </span>
          ) : null}
        </div>
      </div>

      {showLegend && slices.length > 0 ? (
        <ul className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
          {slices.map((slice) => {
            const visual = budgetCategoryVisual(slice.name, slice.kind);
            const Icon = visual.icon;
            return (
              <li
                key={slice.categoryId}
                className="flex min-w-0 items-center gap-1.5 text-xs sm:gap-2 sm:text-sm"
                data-testid="dashboard-budget-slice"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md sm:size-7",
                    visual.chipClassName,
                  )}
                  aria-hidden
                >
                  <Icon className="size-3 sm:size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {slice.name}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCents(slice.amountCents)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : showLegend ? (
        <p
          className="min-w-0 flex-1 text-sm text-muted-foreground"
          data-testid="dashboard-budget-chart-empty"
        >
          No spending yet
        </p>
      ) : null}
    </div>
  );
}
