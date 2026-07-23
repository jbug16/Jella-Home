"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  currentWeekStart,
  formatWeekLabel,
  shiftWeekStart,
} from "@/lib/domain/meal-plan";

type WeekNavigatorProps = {
  weekStart: string;
  /** Route prefix without query, e.g. `/meals` or `/shopping`. */
  basePath?: string;
  /** Prefix for data-testid attributes (default `meals`). */
  testIdPrefix?: string;
};

/**
 * Week chrome sized to match the "Plan a meal" control (44px).
 * Label column uses a fixed width so prev/next stay put across weeks, and
 * "Jump to this week" sits on a reserved second row so it never shifts the
 * main prev / label / next row.
 */
export function WeekNavigator({
  weekStart,
  basePath = "/meals",
  testIdPrefix = "meals",
}: WeekNavigatorProps) {
  const previous = shiftWeekStart(weekStart, -1);
  const next = shiftWeekStart(weekStart, 1);
  const thisWeek = currentWeekStart();
  const isCurrent = weekStart === thisWeek;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-0.5">
      <div className="flex h-11 min-w-0 items-center gap-0.5">
        <IconButton
          label="Previous week"
          variant="ghost"
          className="text-muted-foreground"
          asChild
        >
          <Link
            href={`${basePath}?week=${previous}`}
            data-testid={`${testIdPrefix}-prev-week`}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        </IconButton>
        {/*
          Fixed width for longest typical label (“Sep 28 – Oct 4, 2026”).
          Centered + truncated so shorter labels never nudge the chevrons.
        */}
        <p
          className="w-[12rem] shrink-0 truncate text-center text-sm leading-none text-muted-foreground tabular-nums"
          data-testid={`${testIdPrefix}-week-label`}
        >
          {formatWeekLabel(weekStart)}
        </p>
        <IconButton
          label="Next week"
          variant="ghost"
          className="text-muted-foreground"
          asChild
        >
          <Link
            href={`${basePath}?week=${next}`}
            data-testid={`${testIdPrefix}-next-week`}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </IconButton>
      </div>
      {/* Reserved row — keeps prev/label/next rock-solid when Jump appears. */}
      <div className="flex h-5 w-[12rem] max-w-full items-center justify-center self-center">
        {!isCurrent ? (
          <Button
            variant="link"
            className="h-5 min-h-0 px-0 py-0 text-xs leading-none"
            asChild
          >
            <Link
              href={`${basePath}?week=${thisWeek}`}
              data-testid={`${testIdPrefix}-this-week`}
            >
              Jump to this week
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
