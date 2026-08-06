"use client";

import Link from "next/link";

import { PeriodNavigator } from "@/components/common/period-navigator";
import {
  currentBudgetYear,
  currentMonthStart,
  formatMonthLabel,
  shiftMonthStart,
  type BudgetPeriod,
} from "@/lib/domain/budget";
import { cn } from "@/lib/utils";

export function BudgetPeriodControls({ period }: { period: BudgetPeriod }) {
  const month =
    period.view === "month"
      ? period.monthStart.slice(0, 7)
      : `${period.year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const year =
    period.view === "year"
      ? period.year
      : Number(period.monthStart.slice(0, 4));
  return (
    <div className="space-y-2">
      <div
        className="grid grid-cols-2 rounded-lg border p-1"
        aria-label="Budget period view"
      >
        <Link
          href={`/budget?view=month&month=${month}`}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-md text-sm font-medium",
            period.view === "month" ? "bg-muted" : "text-muted-foreground",
          )}
          aria-current={period.view === "month" ? "page" : undefined}
          data-testid="budget-period-month"
        >
          Month
        </Link>
        <Link
          href={`/budget?view=year&year=${year}`}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-md text-sm font-medium",
            period.view === "year" ? "bg-muted" : "text-muted-foreground",
          )}
          aria-current={period.view === "year" ? "page" : undefined}
          data-testid="budget-period-year"
        >
          Year
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {period.view === "month" ? (
          <PeriodNavigator
            label={formatMonthLabel(period.monthStart)}
            prevHref={`/budget?view=month&month=${shiftMonthStart(period.monthStart, -1).slice(0, 7)}`}
            nextHref={`/budget?view=month&month=${shiftMonthStart(period.monthStart, 1).slice(0, 7)}`}
            prevAriaLabel="Previous month"
            nextAriaLabel="Next month"
            prevTestId="budget-prev-month"
            nextTestId="budget-next-month"
            labelTestId="budget-month-label"
          />
        ) : (
          <PeriodNavigator
            label={String(period.year)}
            prevHref={`/budget?view=year&year=${period.year - 1}`}
            nextHref={`/budget?view=year&year=${period.year + 1}`}
            prevAriaLabel="Previous year"
            nextAriaLabel="Next year"
            prevTestId="budget-prev-year"
            nextTestId="budget-next-year"
            labelTestId="budget-year-label"
          />
        )}
        <Link
          className="flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
          href={
            period.view === "month"
              ? `/budget?view=month&month=${currentMonthStart().slice(0, 7)}`
              : `/budget?view=year&year=${currentBudgetYear()}`
          }
        >
          Current
        </Link>
      </div>
    </div>
  );
}
