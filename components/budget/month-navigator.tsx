"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonthLabel, shiftMonthStart } from "@/lib/domain/budget";

type MonthNavigatorProps = {
  monthStart: string;
};

export function MonthNavigator({ monthStart }: MonthNavigatorProps) {
  const previous = shiftMonthStart(monthStart, -1);
  const next = shiftMonthStart(monthStart, 1);

  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" size="icon" className="size-11" asChild>
        <Link
          href={`/budget?month=${previous}`}
          aria-label="Previous month"
          data-testid="budget-prev-month"
        >
          <ChevronLeft className="size-5" />
        </Link>
      </Button>
      <p
        className="text-center text-base font-medium"
        data-testid="budget-month-label"
      >
        {formatMonthLabel(monthStart)}
      </p>
      <Button variant="outline" size="icon" className="size-11" asChild>
        <Link
          href={`/budget?month=${next}`}
          aria-label="Next month"
          data-testid="budget-next-month"
        >
          <ChevronRight className="size-5" />
        </Link>
      </Button>
    </div>
  );
}
