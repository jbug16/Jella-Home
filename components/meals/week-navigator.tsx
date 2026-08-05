"use client";

import { PeriodNavigator } from "@/components/common/period-navigator";
import { formatWeekLabel, shiftWeekStart } from "@/lib/domain/meal-plan";

type WeekNavigatorProps = {
  weekStart: string;
  /** Route prefix without query, e.g. `/meals` or `/shopping`. */
  basePath?: string;
  /** Prefix for data-testid attributes (default `meals`). */
  testIdPrefix?: string;
};

export function WeekNavigator({
  weekStart,
  basePath = "/meals",
  testIdPrefix = "meals",
}: WeekNavigatorProps) {
  const previous = shiftWeekStart(weekStart, -1);
  const next = shiftWeekStart(weekStart, 1);

  return (
    <PeriodNavigator
      label={formatWeekLabel(weekStart)}
      prevHref={`${basePath}?week=${previous}`}
      nextHref={`${basePath}?week=${next}`}
      prevAriaLabel="Previous week"
      nextAriaLabel="Next week"
      prevTestId={`${testIdPrefix}-prev-week`}
      nextTestId={`${testIdPrefix}-next-week`}
      labelTestId={`${testIdPrefix}-week-label`}
    />
  );
}
