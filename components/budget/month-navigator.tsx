"use client";

import { PeriodNavigator } from "@/components/common/period-navigator";
import { formatMonthLabel, shiftMonthStart } from "@/lib/domain/budget";

type MonthNavigatorProps = {
  monthStart: string;
  /** Route prefix without query. Defaults to `/budget`. */
  basePath?: string;
  /** Prefix for data-testid attributes (default `budget`). */
  testIdPrefix?: string;
};

function monthParam(monthStart: string): string {
  return monthStart.slice(0, 7);
}

export function MonthNavigator({
  monthStart,
  basePath = "/budget",
  testIdPrefix = "budget",
}: MonthNavigatorProps) {
  const previous = shiftMonthStart(monthStart, -1);
  const next = shiftMonthStart(monthStart, 1);

  return (
    <PeriodNavigator
      label={formatMonthLabel(monthStart)}
      prevHref={`${basePath}?month=${monthParam(previous)}`}
      nextHref={`${basePath}?month=${monthParam(next)}`}
      prevAriaLabel="Previous month"
      nextAriaLabel="Next month"
      prevTestId={`${testIdPrefix}-prev-month`}
      nextTestId={`${testIdPrefix}-next-month`}
      labelTestId={`${testIdPrefix}-month-label`}
    />
  );
}
