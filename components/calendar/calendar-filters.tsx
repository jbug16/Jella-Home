"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CALENDAR_EVENT_CATEGORY_COLORS,
  CALENDAR_EVENT_CATEGORY_LABELS,
  CALENDAR_FILTER_CATEGORIES,
  type CalendarEventCategory,
} from "@/lib/domain/calendar-event";
import { cn } from "@/lib/utils";

export type CategoryVisibility = Record<CalendarEventCategory, boolean>;

type CalendarFiltersProps = {
  categories: CategoryVisibility;
  showSubscriptions: boolean;
  onToggleCategory: (key: CalendarEventCategory) => void;
  onToggleSubscriptions: () => void;
  onShowAll: () => void;
  onHideAll: () => void;
};

export function CalendarFilters({
  categories,
  showSubscriptions,
  onToggleCategory,
  onToggleSubscriptions,
  onShowAll,
  onHideAll,
}: CalendarFiltersProps) {
  const activeDots = CALENDAR_FILTER_CATEGORIES.filter((key) => categories[key]);
  const activeCount =
    activeDots.length + (showSubscriptions ? 1 : 0);
  const totalCount = CALENDAR_FILTER_CATEGORIES.length + 1;
  const allOn = activeCount === totalCount;

  return (
    <div data-testid="calendar-filters">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 max-w-full gap-2 px-3"
            data-testid="calendar-filters-trigger"
            aria-label={`Calendars, ${activeCount} of ${totalCount} visible`}
          >
            <span className="flex items-center gap-0.5" aria-hidden>
              {(allOn
                ? CALENDAR_FILTER_CATEGORIES.slice(0, 5)
                : activeDots.slice(0, 5)
              ).map((key) => (
                <span
                  key={key}
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    CALENDAR_EVENT_CATEGORY_COLORS[key].dot,
                  )}
                />
              ))}
              {(allOn ? CALENDAR_FILTER_CATEGORIES : activeDots).length > 5 ? (
                <span className="ml-0.5 text-[10px] text-muted-foreground">
                  +
                </span>
              ) : null}
            </span>
            <span className="text-sm font-medium">Calendars</span>
            {!allOn ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {activeCount}/{totalCount}
              </span>
            ) : null}
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-60 p-2"
          data-testid="calendar-filters-menu"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-medium text-muted-foreground">
              Show calendars
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                data-testid="calendar-filters-show-all"
                onClick={onShowAll}
              >
                All
              </button>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                data-testid="calendar-filters-hide-all"
                onClick={onHideAll}
              >
                None
              </button>
            </div>
          </div>
          <div
            className="flex max-h-72 flex-col gap-0.5 overflow-y-auto"
            role="group"
            aria-label="Calendar categories"
          >
            {CALENDAR_FILTER_CATEGORIES.map((key) => {
              const on = categories[key];
              return (
                <FilterRow
                  key={key}
                  testId={`calendar-filter-${key}`}
                  label={CALENDAR_EVENT_CATEGORY_LABELS[key]}
                  pressed={on}
                  dotClass={CALENDAR_EVENT_CATEGORY_COLORS[key].dot}
                  onToggle={() => onToggleCategory(key)}
                />
              );
            })}
            <FilterRow
              testId="calendar-filter-subscriptions"
              label="Subscriptions"
              pressed={showSubscriptions}
              dotClass="border border-dashed border-muted-foreground/70 bg-transparent"
              onToggle={onToggleSubscriptions}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterRow({
  testId,
  label,
  pressed,
  dotClass,
  onToggle,
}: {
  testId: string;
  label: string;
  pressed: boolean;
  dotClass: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-testid={testId}
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors",
        "hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !pressed && "opacity-55",
      )}
      onClick={onToggle}
    >
      <span
        className={cn("size-2.5 shrink-0 rounded-full", dotClass)}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {pressed ? (
        <Check className="size-3.5 shrink-0 text-foreground" aria-hidden />
      ) : (
        <span className="size-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
}
