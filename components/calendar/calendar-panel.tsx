"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cake,
  CalendarHeart,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Home,
  MapPin,
  PartyPopper,
  Plane,
  Plus,
  Stethoscope,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { setCalendarSourceVisibleAction } from "@/app/(app)/calendar/actions";
import { CalendarEventFormDialog } from "@/components/calendar/event-form-dialog";
import { DeleteCalendarEventDialog } from "@/components/calendar/delete-event-dialog";
import { Button } from "@/components/ui/button";
import type { CalendarRangeViewModel } from "@/lib/calendar/get-calendar-range-view-model";
import {
  CALENDAR_EVENT_CATEGORY_LABELS,
  CALENDAR_SOURCE_LABELS,
  CALENDAR_V1_VISIBLE_SOURCE_KEYS,
  formatLocalTimeDisplay,
  type CalendarEventCategory,
  type CalendarOccurrence,
  type CalendarSourceKey,
} from "@/lib/domain/calendar-event";
import { formatMonthLabel, shiftMonthStart } from "@/lib/domain/budget";
import {
  daysInWeek,
  formatDayOfMonth,
  formatWeekdayShort,
  formatWeekLabel,
  shiftWeekStart,
  weekStartOn,
} from "@/lib/domain/meal-plan";
import { cn } from "@/lib/utils";

type CalendarPanelProps = {
  viewModel: CalendarRangeViewModel;
  todayIso: string;
  thisWeekStart: string;
  thisMonthStart: string;
};

function categoryIcon(category: CalendarEventCategory | null) {
  switch (category) {
    case "appointment":
      return Stethoscope;
    case "date":
      return CalendarHeart;
    case "birthday":
      return Cake;
    case "holiday":
      return PartyPopper;
    case "household":
      return Home;
    case "reminder":
      return CircleDot;
    case "trip":
      return Plane;
    default:
      return CalendarRange;
  }
}

function calendarHref(args: {
  view: "week" | "month";
  week: string;
  month: string;
  day: string;
}): string {
  const params = new URLSearchParams({
    view: args.view,
    week: args.week,
    month: args.month.slice(0, 7),
    day: args.day,
  });
  return `/calendar?${params.toString()}`;
}

function occurrencesForDay(
  occurrences: CalendarOccurrence[],
  dayIso: string,
): CalendarOccurrence[] {
  return occurrences.filter(
    (occ) => occ.startOn <= dayIso && occ.endOn >= dayIso,
  );
}

export function CalendarPanel({
  viewModel,
  todayIso,
  thisWeekStart,
  thisMonthStart,
}: CalendarPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);

  const {
    view,
    weekStart,
    monthStart,
    selectedDay,
    preferences,
    occurrences,
    events,
  } = viewModel;

  const selectedOccurrences = viewModel.selectedDayOccurrences;
  const weekDays = useMemo(() => daysInWeek(weekStart), [weekStart]);

  const eventsById = useMemo(() => {
    const map = new Map(events.map((event) => [event.id, event]));
    return map;
  }, [events]);

  const monthCells = useMemo(() => {
    const gridStart = weekStartOn(monthStart);
    const cells: string[] = [];
    for (let i = 0; i < 42; i += 1) {
      const [y, m, d] = gridStart.split("-").map(Number);
      const date = new Date(y!, m! - 1, d! + i);
      const yy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      cells.push(`${yy}-${mm}-${dd}`);
    }
    // Trim trailing week if entirely outside month
    const monthPrefix = monthStart.slice(0, 7);
    while (cells.length > 35) {
      const lastWeek = cells.slice(-7);
      if (lastWeek.every((iso) => !iso.startsWith(monthPrefix))) {
        cells.splice(-7);
      } else {
        break;
      }
    }
    return cells;
  }, [monthStart]);

  function toggleSource(sourceKey: CalendarSourceKey, visible: boolean) {
    setPrefError(null);
    startTransition(async () => {
      const result = await setCalendarSourceVisibleAction(sourceKey, visible);
      if (result.error) {
        setPrefError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function openCreate() {
    setEditingSeriesId(null);
    setFormOpen(true);
  }

  function openEdit(seriesId: string) {
    setEditingSeriesId(seriesId);
    setFormOpen(true);
  }

  const rangeLabel =
    view === "week" ? formatWeekLabel(weekStart) : formatMonthLabel(monthStart);

  const prevHref =
    view === "week"
      ? calendarHref({
          view,
          week: shiftWeekStart(weekStart, -1),
          month: monthStart,
          day: shiftWeekStart(weekStart, -1),
        })
      : calendarHref({
          view,
          week: weekStart,
          month: shiftMonthStart(monthStart, -1),
          day: shiftMonthStart(monthStart, -1),
        });

  const nextHref =
    view === "week"
      ? calendarHref({
          view,
          week: shiftWeekStart(weekStart, 1),
          month: monthStart,
          day: shiftWeekStart(weekStart, 1),
        })
      : calendarHref({
          view,
          week: weekStart,
          month: shiftMonthStart(monthStart, 1),
          day: shiftMonthStart(monthStart, 1),
        });

  const todayHref = calendarHref({
    view,
    week: thisWeekStart,
    month: thisMonthStart,
    day: todayIso,
  });

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="calendar-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-lg border border-border p-1"
          role="radiogroup"
          aria-label="Calendar view"
        >
          <Button
            asChild
            variant={view === "week" ? "secondary" : "ghost"}
            size="sm"
            className="min-h-11 min-w-20"
          >
            <Link
              href={calendarHref({
                view: "week",
                week: weekStartOn(selectedDay),
                month: monthStart,
                day: selectedDay,
              })}
              role="radio"
              aria-checked={view === "week"}
              data-testid="calendar-view-week"
            >
              Week
            </Link>
          </Button>
          <Button
            asChild
            variant={view === "month" ? "secondary" : "ghost"}
            size="sm"
            className="min-h-11 min-w-20"
          >
            <Link
              href={calendarHref({
                view: "month",
                week: weekStart,
                month: monthStart,
                day: selectedDay,
              })}
              role="radio"
              aria-checked={view === "month"}
              data-testid="calendar-view-month"
            >
              Month
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="icon" className="size-11" asChild>
            <Link
              href={prevHref}
              aria-label="Previous"
              data-testid="calendar-prev"
            >
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <p
            className="min-w-[10rem] text-center text-sm font-medium tabular-nums"
            data-testid="calendar-range-label"
          >
            {rangeLabel}
          </p>
          <Button variant="ghost" size="icon" className="size-11" asChild>
            <Link href={nextHref} aria-label="Next" data-testid="calendar-next">
              <ChevronRight className="size-5" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="min-h-11" asChild>
            <Link href={todayHref} data-testid="calendar-today">
              Today
            </Link>
          </Button>
          <Button
            className="min-h-11"
            onClick={openCreate}
            data-testid="calendar-add-event"
          >
            <Plus className="size-4" />
            Add event
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Calendar sources"
      >
        {CALENDAR_V1_VISIBLE_SOURCE_KEYS.map((key) => {
          const on = preferences[key];
          return (
            <Button
              key={key}
              type="button"
              variant={on ? "secondary" : "outline"}
              size="sm"
              className="min-h-11"
              aria-pressed={on}
              disabled={pending}
              data-testid={`calendar-source-${key}`}
              onClick={() => toggleSource(key, !on)}
            >
              {CALENDAR_SOURCE_LABELS[key]}
            </Button>
          );
        })}
      </div>
      {prefError ? (
        <p className="text-sm text-destructive" role="alert">
          {prefError}
        </p>
      ) : null}

      {view === "week" ? (
        <WeekLayout
          weekDays={weekDays}
          selectedDay={selectedDay}
          todayIso={todayIso}
          weekStart={weekStart}
          monthStart={monthStart}
          occurrences={occurrences}
        />
      ) : (
        <MonthLayout
          cells={monthCells}
          monthStart={monthStart}
          selectedDay={selectedDay}
          todayIso={todayIso}
          weekStart={weekStart}
          occurrences={occurrences}
        />
      )}

      <SelectedDayList
        selectedDay={selectedDay}
        occurrences={selectedOccurrences}
        onEdit={openEdit}
        onDelete={setDeleteSeriesId}
        onAdd={openCreate}
      />

      <CalendarEventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultStartOn={selectedDay}
        seriesId={editingSeriesId}
        event={
          editingSeriesId ? (eventsById.get(editingSeriesId) ?? null) : null
        }
      />

      <DeleteCalendarEventDialog
        open={Boolean(deleteSeriesId)}
        onOpenChange={(open) => {
          if (!open) setDeleteSeriesId(null);
        }}
        eventId={deleteSeriesId}
        isRecurring={
          deleteSeriesId
            ? (eventsById.get(deleteSeriesId)?.recurrence ?? "none") !== "none"
            : false
        }
      />
    </div>
  );
}

function WeekLayout(props: {
  weekDays: string[];
  selectedDay: string;
  todayIso: string;
  weekStart: string;
  monthStart: string;
  occurrences: CalendarOccurrence[];
}) {
  return (
    <>
      {/* Desktop / tablet: seven columns */}
      <div
        className="hidden gap-2 md:grid md:grid-cols-7"
        data-testid="calendar-week-desktop"
      >
        {props.weekDays.map((dayIso) => (
          <DayColumn
            key={dayIso}
            dayIso={dayIso}
            selected={dayIso === props.selectedDay}
            isToday={dayIso === props.todayIso}
            href={calendarHref({
              view: "week",
              week: props.weekStart,
              month: props.monthStart,
              day: dayIso,
            })}
            occurrences={occurrencesForDay(props.occurrences, dayIso)}
          />
        ))}
      </div>

      {/* Mobile: stacked bands */}
      <div
        className="flex flex-col gap-2 md:hidden"
        data-testid="calendar-week-mobile"
      >
        {props.weekDays.map((dayIso) => (
          <DayBand
            key={dayIso}
            dayIso={dayIso}
            selected={dayIso === props.selectedDay}
            isToday={dayIso === props.todayIso}
            href={calendarHref({
              view: "week",
              week: props.weekStart,
              month: props.monthStart,
              day: dayIso,
            })}
            occurrences={occurrencesForDay(props.occurrences, dayIso)}
          />
        ))}
      </div>
    </>
  );
}

function MonthLayout(props: {
  cells: string[];
  monthStart: string;
  selectedDay: string;
  todayIso: string;
  weekStart: string;
  occurrences: CalendarOccurrence[];
}) {
  const monthPrefix = props.monthStart.slice(0, 7);
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div data-testid="calendar-month-grid">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={formatMonthLabel(props.monthStart)}
      >
        {props.cells.map((dayIso) => {
          const inMonth = dayIso.startsWith(monthPrefix);
          const dayOcc = occurrencesForDay(props.occurrences, dayIso);
          const count = dayOcc.length;
          const selected = dayIso === props.selectedDay;
          const isToday = dayIso === props.todayIso;
          return (
            <Link
              key={dayIso}
              href={calendarHref({
                view: "month",
                week: props.weekStart,
                month: props.monthStart,
                day: dayIso,
              })}
              role="gridcell"
              aria-selected={selected}
              aria-current={isToday ? "date" : undefined}
              data-testid={`calendar-month-day-${dayIso}`}
              className={cn(
                "flex min-h-11 flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-center transition-colors",
                inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground",
                selected && "border-primary ring-1 ring-primary",
                isToday && !selected && "border-foreground/40",
              )}
            >
              <span className="text-sm font-medium tabular-nums">
                {formatDayOfMonth(dayIso)}
              </span>
              {count > 0 ? (
                <span className="flex items-center gap-0.5">
                  <span
                    className="size-1.5 rounded-full bg-primary"
                    aria-hidden
                  />
                  {count > 1 ? (
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="h-2" aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DayColumn(props: {
  dayIso: string;
  selected: boolean;
  isToday: boolean;
  href: string;
  occurrences: CalendarOccurrence[];
}) {
  const preview = props.occurrences.slice(0, 3);
  const overflow = props.occurrences.length - preview.length;

  return (
    <Link
      href={props.href}
      data-testid={`calendar-week-day-${props.dayIso}`}
      className={cn(
        "flex min-h-40 flex-col gap-1 rounded-xl border p-2 transition-colors",
        props.selected && "border-primary ring-1 ring-primary",
        props.isToday && !props.selected && "border-foreground/30",
      )}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xs text-muted-foreground">
          {formatWeekdayShort(props.dayIso)}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatDayOfMonth(props.dayIso)}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {preview.map((occ) => (
          <li
            key={occ.id}
            className={cn(
              "truncate rounded-md px-1.5 py-0.5 text-xs",
              occ.readonly
                ? "border border-dashed border-muted-foreground/40 text-muted-foreground"
                : "bg-muted",
            )}
          >
            {occ.title}
          </li>
        ))}
        {overflow > 0 ? (
          <li className="text-xs text-muted-foreground">+{overflow} more</li>
        ) : null}
      </ul>
    </Link>
  );
}

function DayBand(props: {
  dayIso: string;
  selected: boolean;
  isToday: boolean;
  href: string;
  occurrences: CalendarOccurrence[];
}) {
  return (
    <Link
      href={props.href}
      data-testid={`calendar-week-band-${props.dayIso}`}
      className={cn(
        "flex min-h-11 items-start gap-3 rounded-xl border px-3 py-2",
        props.selected && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="w-14 shrink-0">
        <p className="text-xs text-muted-foreground">
          {formatWeekdayShort(props.dayIso)}
        </p>
        <p className="text-base font-semibold tabular-nums">
          {formatDayOfMonth(props.dayIso)}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        {props.occurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {props.occurrences.slice(0, 4).map((occ) => (
              <li key={occ.id} className="truncate text-sm">
                {occ.title}
              </li>
            ))}
            {props.occurrences.length > 4 ? (
              <li className="text-xs text-muted-foreground">
                +{props.occurrences.length - 4} more
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </Link>
  );
}

function SelectedDayList(props: {
  selectedDay: string;
  occurrences: CalendarOccurrence[];
  onEdit: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
  onAdd: () => void;
}) {
  const date = props.selectedDay;
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y!, m! - 1, d!).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section
      className="rounded-2xl border border-border/80 bg-card p-4"
      data-testid="calendar-selected-day"
      aria-label={`Events for ${label}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">{label}</h2>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={props.onAdd}
          data-testid="calendar-selected-add"
        >
          Add
        </Button>
      </div>

      {props.occurrences.length === 0 ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="calendar-selected-empty"
        >
          Nothing scheduled this day.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {props.occurrences.map((occ) => {
            const Icon = categoryIcon(occ.category);
            const timeLabel = occ.allDay
              ? "All day"
              : occ.startAt
                ? formatLocalTimeDisplay(occ.startAt)
                : "";
            const categoryLabel = occ.category
              ? CALENDAR_EVENT_CATEGORY_LABELS[occ.category]
              : occ.sourceKey === "subscription_renewals"
                ? "Subscription"
                : "Event";

            const body = (
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Icon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{occ.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel}
                    {timeLabel ? ` · ${timeLabel}` : ""}
                    {occ.location ? (
                      <>
                        {" · "}
                        <MapPin className="inline size-3" aria-hidden />{" "}
                        {occ.location}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            );

            if (occ.readonly && occ.href) {
              return (
                <li key={occ.id}>
                  <Link
                    href={occ.href}
                    className="flex min-h-11 items-center rounded-lg border border-dashed border-muted-foreground/40 px-3 py-2"
                    data-testid={`calendar-occ-${occ.id}`}
                  >
                    {body}
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      Subscription
                    </span>
                  </Link>
                </li>
              );
            }

            return (
              <li
                key={occ.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                data-testid={`calendar-occ-${occ.id}`}
              >
                {body}
                {occ.seriesId ? (
                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11"
                      onClick={() => props.onEdit(occ.seriesId!)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11 text-destructive"
                      onClick={() => props.onDelete(occ.seriesId!)}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
