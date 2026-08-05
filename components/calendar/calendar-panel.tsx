"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import {
  CalendarFilters,
  type CategoryVisibility,
} from "@/components/calendar/calendar-filters";
import { CalendarEventFormDialog } from "@/components/calendar/event-form-dialog";
import { DeleteCalendarEventDialog } from "@/components/calendar/delete-event-dialog";
import { EventChip } from "@/components/calendar/event-chip";
import { QuietDayAdd } from "@/components/meals/quiet-day-add";
import { WeekNavigator } from "@/components/meals/week-navigator";
import { PeriodPanelHeader } from "@/components/common/panel-header";
import { PrimaryAddButton } from "@/components/common/primary-add-button";
import {
  CALENDAR_FILTER_CATEGORIES,
  groupOccurrencesByDate,
  type CalendarEvent,
  type CalendarEventCategory,
  type CalendarOccurrence,
} from "@/lib/domain/calendar-event";
import {
  daysInWeek,
  formatDayOfMonth,
  formatWeekdayShort,
} from "@/lib/domain/meal-plan";
import { cn } from "@/lib/utils";

type CalendarPanelProps = {
  weekStart: string;
  todayIso: string;
  events: CalendarEvent[];
  occurrences: CalendarOccurrence[];
};

type DialogState =
  | { type: "closed" }
  | { type: "form"; seriesId?: string; defaultStartOn: string }
  | { type: "delete"; seriesId: string };

type EventHandlers = {
  onAdd: (dayIso: string) => void;
  onEdit: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
};

function defaultCategoryVisibility(): CategoryVisibility {
  return Object.fromEntries(
    CALENDAR_FILTER_CATEGORIES.map((key) => [key, true]),
  ) as CategoryVisibility;
}

/** Matches Tailwind `lg` — day spine below, week board at lg+. */
const NARROW_QUERY = "(max-width: 1023px)";

function subscribeNarrow(onStoreChange: () => void) {
  const media = window.matchMedia(NARROW_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getNarrowSnapshot() {
  return window.matchMedia(NARROW_QUERY).matches;
}

function getNarrowServerSnapshot() {
  return false;
}

function dayLabel(day: string) {
  return `${formatWeekdayShort(day)} ${formatDayOfMonth(day)}`;
}

function occurrenceVisible(
  occ: CalendarOccurrence,
  categories: CategoryVisibility,
  showSubscriptions: boolean,
): boolean {
  if (occ.sourceKey === "subscription_renewals") {
    return showSubscriptions;
  }
  if (occ.category == null) {
    return true;
  }
  return categories[occ.category];
}

export function CalendarPanel({
  weekStart,
  todayIso,
  events,
  occurrences,
}: CalendarPanelProps) {
  const weekDays = useMemo(() => daysInWeek(weekStart), [weekStart]);
  const [categories, setCategories] = useState(defaultCategoryVisibility);
  const [showSubscriptions, setShowSubscriptions] = useState(true);

  const filtered = useMemo(
    () =>
      occurrences.filter((occ) =>
        occurrenceVisible(occ, categories, showSubscriptions),
      ),
    [occurrences, categories, showSubscriptions],
  );

  const byDate = useMemo(
    () => groupOccurrencesByDate(filtered, weekDays),
    [filtered, weekDays],
  );

  const eventsById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isNarrow = useSyncExternalStore(
    subscribeNarrow,
    getNarrowSnapshot,
    getNarrowServerSnapshot,
  );

  const defaultDay = weekDays.includes(todayIso) ? todayIso : weekStart;
  const openDays = weekDays.filter(
    (day) => (byDate.get(day) ?? []).length === 0,
  );
  const preferredAddDay = openDays[0] ?? defaultDay;

  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });

  function openAdd(dayIso: string) {
    setDialog({ type: "form", defaultStartOn: dayIso });
  }

  function closeDialog() {
    setDialog({ type: "closed" });
  }

  const handlers: EventHandlers = {
    onAdd: openAdd,
    onEdit: (seriesId) => {
      window.setTimeout(() => {
        setDialog({
          type: "form",
          seriesId,
          defaultStartOn: defaultDay,
        });
      }, 0);
    },
    onDelete: (seriesId) => {
      window.setTimeout(() => {
        setDialog({ type: "delete", seriesId });
      }, 0);
    },
  };

  function toggleCategory(key: CalendarEventCategory) {
    setCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function showAllCalendars() {
    setCategories(defaultCategoryVisibility());
    setShowSubscriptions(true);
  }

  function hideAllCalendars() {
    setCategories(
      Object.fromEntries(
        CALENDAR_FILTER_CATEGORIES.map((key) => [key, false]),
      ) as CategoryVisibility,
    );
    setShowSubscriptions(false);
  }

  const editingEvent =
    dialog.type === "form" && dialog.seriesId
      ? (eventsById.get(dialog.seriesId) ?? null)
      : null;

  const deleteEvent =
    dialog.type === "delete" ? (eventsById.get(dialog.seriesId) ?? null) : null;

  return (
    <div
      className="flex min-w-0 flex-col gap-3 overflow-x-hidden"
      data-testid="calendar-panel"
    >
      <PeriodPanelHeader
        navigator={
          <WeekNavigator
            weekStart={weekStart}
            basePath="/calendar"
            testIdPrefix="calendar"
          />
        }
        actions={
          <>
            <CalendarFilters
              categories={categories}
              showSubscriptions={showSubscriptions}
              onToggleCategory={toggleCategory}
              onToggleSubscriptions={() =>
                setShowSubscriptions((prev) => !prev)
              }
              onShowAll={showAllCalendars}
              onHideAll={hideAllCalendars}
            />
            <PrimaryAddButton
              label="Add event"
              onClick={() => openAdd(preferredAddDay)}
              data-testid="calendar-add-event"
            />
          </>
        }
      />

      {!isMounted ? (
        <div
          className="min-h-48 rounded-xl bg-muted/20"
          aria-hidden
          data-testid="calendar-layout-pending"
        />
      ) : isNarrow ? (
        <PhoneDaySpine
          weekDays={weekDays}
          todayIso={todayIso}
          byDate={byDate}
          handlers={handlers}
        />
      ) : (
        <WeekBoard
          weekDays={weekDays}
          todayIso={todayIso}
          byDate={byDate}
          handlers={handlers}
        />
      )}

      <CalendarEventFormDialog
        key={
          dialog.type === "form"
            ? `event-form-${dialog.seriesId ?? "new"}-${dialog.defaultStartOn}`
            : "event-form-closed"
        }
        open={dialog.type === "form"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        defaultStartOn={
          dialog.type === "form" ? dialog.defaultStartOn : preferredAddDay
        }
        seriesId={dialog.type === "form" ? (dialog.seriesId ?? null) : null}
        event={editingEvent}
      />

      <DeleteCalendarEventDialog
        key={dialog.type === "delete" ? dialog.seriesId : "delete-event-closed"}
        open={dialog.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        eventId={dialog.type === "delete" ? dialog.seriesId : null}
        updatedAt={deleteEvent?.updatedAt ?? null}
        isRecurring={deleteEvent ? deleteEvent.recurrence !== "none" : false}
      />
    </div>
  );
}

/** Desktop / tablet: seven day columns with event chips. */
function WeekBoard({
  weekDays,
  todayIso,
  byDate,
  handlers,
}: {
  weekDays: string[];
  todayIso: string;
  byDate: Map<string, CalendarOccurrence[]>;
  handlers: EventHandlers;
}) {
  return (
    <div
      className="min-w-0 max-w-full overflow-x-auto"
      data-testid="calendar-week-grid"
    >
      <div
        className="grid min-w-[56rem] grid-cols-7 gap-1.5"
        role="list"
        aria-label="This week’s events"
      >
        {weekDays.map((day) => {
          const dayEvents = byDate.get(day) ?? [];
          const isToday = day === todayIso;

          return (
            <section
              key={day}
              role="listitem"
              className={cn(
                "flex min-w-0 flex-col gap-2 rounded-2xl px-1.5 py-2",
                isToday ? "bg-muted/35" : null,
              )}
              data-testid={`calendar-day-column-${day}`}
            >
              <header className="px-0.5 text-center">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {formatWeekdayShort(day)}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-lg font-semibold tabular-nums tracking-tight",
                    isToday
                      ? "inline-block border-b-2 border-foreground pb-0.5"
                      : "text-foreground/90",
                  )}
                >
                  {formatDayOfMonth(day)}
                </p>
                {isToday ? (
                  <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                    Today
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-transparent select-none">
                    ·
                  </p>
                )}
              </header>

              <div className="flex flex-1 flex-col gap-2">
                {dayEvents.map((occ) => (
                  <EventChip
                    key={occ.id}
                    occurrence={occ}
                    variant="board"
                    onEdit={handlers.onEdit}
                    onDelete={handlers.onDelete}
                  />
                ))}
                <QuietDayAdd
                  label={`Add event on ${dayLabel(day)}`}
                  testId={`calendar-day-add-${day}`}
                  onAdd={() => handlers.onAdd(day)}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Phone: only days with events (plus today if empty). */
function PhoneDaySpine({
  weekDays,
  todayIso,
  byDate,
  handlers,
}: {
  weekDays: string[];
  todayIso: string;
  byDate: Map<string, CalendarOccurrence[]>;
  handlers: EventHandlers;
}) {
  const visibleDays = weekDays.filter((day) => {
    const count = (byDate.get(day) ?? []).length;
    return count > 0 || day === todayIso;
  });

  return (
    <ul className="divide-y rounded-lg border" data-testid="calendar-day-spine">
      {visibleDays.map((day) => {
        const dayEvents = byDate.get(day) ?? [];
        const isToday = day === todayIso;

        return (
          <li
            key={day}
            id={`calendar-day-${day}`}
            className={cn(
              "scroll-mt-16 px-3 py-2",
              isToday ? "bg-muted/20" : null,
            )}
            data-testid={`calendar-slots-${day}`}
          >
            <p
              className={cn(
                "mb-1 text-xs font-medium",
                isToday ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {dayLabel(day)}
              {isToday ? " · Today" : null}
            </p>
            {dayEvents.length > 0 ? (
              <div className="flex flex-col gap-1">
                {dayEvents.map((occ) => (
                  <EventChip
                    key={occ.id}
                    occurrence={occ}
                    variant="row"
                    onEdit={handlers.onEdit}
                    onDelete={handlers.onDelete}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nothing scheduled</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
