"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";

type PeriodNavigatorProps = {
  label: string;
  prevHref: string;
  nextHref: string;
  prevAriaLabel: string;
  nextAriaLabel: string;
  prevTestId: string;
  nextTestId: string;
  labelTestId: string;
};

/**
 * Shared prev / label / next chrome for week and month navigators.
 */
export function PeriodNavigator({
  label,
  prevHref,
  nextHref,
  prevAriaLabel,
  nextAriaLabel,
  prevTestId,
  nextTestId,
  labelTestId,
}: PeriodNavigatorProps) {
  return (
    <div className="flex h-11 min-w-0 w-full items-center gap-0.5">
      <IconButton
        label={prevAriaLabel}
        variant="ghost"
        className="shrink-0 text-muted-foreground"
        asChild
      >
        <Link href={prevHref} data-testid={prevTestId}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      </IconButton>
      <p
        className="min-w-0 flex-1 truncate text-center text-sm text-muted-foreground tabular-nums"
        data-testid={labelTestId}
      >
        {label}
      </p>
      <IconButton
        label={nextAriaLabel}
        variant="ghost"
        className="shrink-0 text-muted-foreground"
        asChild
      >
        <Link href={nextHref} data-testid={nextTestId}>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </IconButton>
    </div>
  );
}
