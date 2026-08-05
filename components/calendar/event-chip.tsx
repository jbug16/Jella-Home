"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  CALENDAR_EVENT_CATEGORY_COLORS,
  CALENDAR_EVENT_CATEGORY_LABELS,
  formatOccurrenceTimeLabel,
  type CalendarOccurrence,
} from "@/lib/domain/calendar-event";
import { cn } from "@/lib/utils";

type EventChipProps = {
  occurrence: CalendarOccurrence;
  /** Compact tile for the week board (default) vs full-width row. */
  variant?: "board" | "row";
  onEdit?: (seriesId: string) => void;
  onDelete?: (seriesId: string) => void;
};

export function EventChip({
  occurrence,
  variant = "board",
  onEdit,
  onDelete,
}: EventChipProps) {
  const timeLabel = formatOccurrenceTimeLabel(occurrence);
  const color =
    occurrence.category != null
      ? CALENDAR_EVENT_CATEGORY_COLORS[occurrence.category]
      : {
          dot: "bg-muted-foreground/50",
          chip: "border-l-muted-foreground/40",
        };
  const calendarLabel =
    occurrence.category != null
      ? CALENDAR_EVENT_CATEGORY_LABELS[occurrence.category]
      : occurrence.sourceKey === "subscription_renewals"
        ? "Subscriptions"
        : "Event";
  const accessibleName = `${occurrence.title}, ${timeLabel || calendarLabel}`;

  if (occurrence.readonly) {
    const className = cn(
      "block min-w-0 rounded-xl border-l-[3px] bg-card shadow-sm ring-1 ring-border/40",
      color.chip,
      occurrence.href ? "transition-shadow hover:ring-border" : null,
      variant === "row" ? "min-h-11 px-2.5 py-2" : "px-2 py-2",
    );
    const body = (
      <>
        <span
          className={cn(
            "block truncate font-semibold text-foreground",
            variant === "row"
              ? "text-sm leading-snug"
              : "text-[13px] leading-snug",
          )}
        >
          {occurrence.title}
        </span>
        {timeLabel ? (
          <span className="mt-0.5 block text-[10px] leading-none text-muted-foreground tabular-nums">
            {timeLabel}
          </span>
        ) : (
          <span className="mt-0.5 block text-[10px] leading-none text-muted-foreground">
            {calendarLabel}
          </span>
        )}
      </>
    );
    if (occurrence.href) {
      return (
        <Link
          href={occurrence.href}
          className={className}
          data-testid={`calendar-occ-${occurrence.id}`}
          aria-label={accessibleName}
        >
          {body}
        </Link>
      );
    }
    return (
      <div className={className} data-testid={`calendar-occ-${occurrence.id}`}>
        {body}
      </div>
    );
  }

  const seriesId = occurrence.seriesId;
  const canMutate = Boolean(seriesId && onEdit && onDelete);

  if (variant === "row") {
    return (
      <div
        className={cn(
          "group/event relative flex min-w-0 items-center gap-1 border-l-[3px] pl-2",
          color.chip,
        )}
        data-testid={`calendar-occ-${occurrence.id}`}
      >
        <button
          type="button"
          className="flex min-h-10 min-w-0 flex-1 flex-col justify-center rounded-md py-1 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Edit ${accessibleName}`}
          data-testid={seriesId ? `calendar-occ-open-${seriesId}` : undefined}
          onClick={() => {
            if (seriesId && onEdit) onEdit(seriesId);
          }}
          disabled={!canMutate}
        >
          <span className="truncate text-sm font-medium leading-snug text-foreground">
            {occurrence.title}
          </span>
          {timeLabel ? (
            <span className="mt-0.5 text-[10px] leading-none text-muted-foreground tabular-nums">
              {timeLabel}
            </span>
          ) : null}
        </button>
        {canMutate ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-8 shrink-0 text-muted-foreground/55 hover:bg-transparent hover:text-destructive sm:inline-flex"
            aria-label={`Delete ${accessibleName}`}
            data-testid={`calendar-delete-${seriesId}`}
            onClick={() => onDelete?.(seriesId!)}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/event relative min-w-0 overflow-hidden rounded-xl border-l-[3px] bg-card shadow-sm ring-1 ring-border/40",
        color.chip,
      )}
      data-testid={`calendar-occ-${occurrence.id}`}
    >
      <button
        type="button"
        className="flex w-full min-w-0 flex-col px-2 py-2 pr-9 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label={`Edit ${accessibleName}`}
        data-testid={seriesId ? `calendar-occ-open-${seriesId}` : undefined}
        onClick={() => {
          if (seriesId && onEdit) onEdit(seriesId);
        }}
        disabled={!canMutate}
      >
        <span className="truncate text-[13px] leading-snug font-semibold text-foreground">
          {occurrence.title}
        </span>
        {timeLabel ? (
          <span className="mt-0.5 text-[10px] leading-none text-muted-foreground tabular-nums">
            {timeLabel}
          </span>
        ) : null}
      </button>
      {canMutate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 bottom-0.5 size-8 text-muted-foreground/50 hover:bg-transparent hover:text-destructive"
          aria-label={`Delete ${accessibleName}`}
          data-testid={`calendar-delete-${seriesId}`}
          onClick={() => onDelete?.(seriesId!)}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
