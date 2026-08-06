"use client";

import Link from "next/link";

import { PeriodNavigator } from "@/components/common/period-navigator";
import { Button } from "@/components/ui/button";
import {
  formatMonthLabel,
  shiftMonthStart,
  type BudgetPeriod,
} from "@/lib/domain/budget";

export function BudgetPeriodNavigator({ period }: { period: BudgetPeriod }) {
  if (period.view === "year") {
    return (
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
    );
  }

  return (
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
  );
}

export function BudgetPeriodToggle({ period }: { period: BudgetPeriod }) {
  const showingMonth = period.view === "month";
  const href = showingMonth
    ? `/budget?view=year&year=${period.monthStart.slice(0, 4)}`
    : `/budget?view=month&month=${period.year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return (
    <Button variant="outline" size="touch" className="w-16 px-0" asChild>
      <Link
        href={href}
        aria-label={`Switch to ${showingMonth ? "year" : "month"} view`}
        data-testid={
          showingMonth ? "budget-period-year" : "budget-period-month"
        }
      >
        {showingMonth ? "Year" : "Month"}
      </Link>
    </Button>
  );
}
