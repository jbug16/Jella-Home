"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { formatMonthLabel, shiftMonthStart } from "@/lib/domain/budget";

type MonthNavigatorProps = {
  monthStart: string;
};

export function MonthNavigator({ monthStart }: MonthNavigatorProps) {
  const previous = shiftMonthStart(monthStart, -1);
  const next = shiftMonthStart(monthStart, 1);

  return (
    <div className="flex items-center justify-between gap-2">
      <IconButton label="Previous month" variant="outline" asChild>
        <Link
          href={`/budget?month=${previous}`}
          data-testid="budget-prev-month"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      </IconButton>
      <p
        className="text-center text-base font-medium"
        data-testid="budget-month-label"
      >
        {formatMonthLabel(monthStart)}
      </p>
      <IconButton label="Next month" variant="outline" asChild>
        <Link href={`/budget?month=${next}`} data-testid="budget-next-month">
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </IconButton>
    </div>
  );
}
