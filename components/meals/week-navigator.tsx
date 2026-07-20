"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  currentWeekStart,
  formatWeekLabel,
  shiftWeekStart,
} from "@/lib/domain/meal-plan";

type WeekNavigatorProps = {
  weekStart: string;
};

/**
 * Week chrome sized to match the "Plan a meal" control (44px).
 * Label column uses a fixed width so prev/next stay put across weeks, and
 * "Jump to this week" sits on a reserved second row so it never shifts the
 * main prev / label / next row.
 */
export function WeekNavigator({ weekStart }: WeekNavigatorProps) {
  const previous = shiftWeekStart(weekStart, -1);
  const next = shiftWeekStart(weekStart, 1);
  const thisWeek = currentWeekStart();
  const isCurrent = weekStart === thisWeek;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-0.5">
      <div className="flex h-11 min-w-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground"
          asChild
        >
          <Link
            href={`/meals?week=${previous}`}
            aria-label="Previous week"
            data-testid="meals-prev-week"
          >
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        {/*
          Fixed width for longest typical label (“Sep 28 – Oct 4, 2026”).
          Centered + truncated so shorter labels never nudge the chevrons.
        */}
        <p
          className="w-[12rem] shrink-0 truncate text-center text-sm leading-none text-muted-foreground tabular-nums"
          data-testid="meals-week-label"
        >
          {formatWeekLabel(weekStart)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground"
          asChild
        >
          <Link
            href={`/meals?week=${next}`}
            aria-label="Next week"
            data-testid="meals-next-week"
          >
            <ChevronRight className="size-5" />
          </Link>
        </Button>
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
              href={`/meals?week=${thisWeek}`}
              data-testid="meals-this-week"
            >
              Jump to this week
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
