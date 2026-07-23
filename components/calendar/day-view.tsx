import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatCalendarHourLabel,
  type CalendarDayEvent,
  type CalendarDayViewModel,
} from "@/lib/domain/calendar";
import { todayIsoDate } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

type CalendarDayViewProps = {
  day: CalendarDayViewModel;
  /** Card title. Defaults to the full date label. */
  heading?: string;
  actionHref?: string;
  actionLabel?: string;
  actionTestId?: string;
  className?: string;
  fillHeight?: boolean;
  now?: Date;
};

/**
 * Shared household calendar day view (events only — never meals).
 * Agenda layout: readable when empty, clear when events exist.
 */
export function CalendarDayView({
  day,
  heading,
  actionHref,
  actionLabel,
  actionTestId,
  className,
  fillHeight = false,
  now = new Date(),
}: CalendarDayViewProps) {
  const timedEvents = day.events
    .filter((event) => !event.allDay)
    .slice()
    .sort(
      (a, b) => a.startHour - b.startHour || a.title.localeCompare(b.title),
    );
  const allDayEvents = day.events.filter((event) => event.allDay);
  const isEmpty = day.events.length === 0;
  const isToday = day.dateIso === todayIsoDate(now);
  const title = heading ?? day.dateLabel;
  const nowHour = now.getHours() + now.getMinutes() / 60;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm",
        fillHeight ? "h-full" : null,
        className,
      )}
      data-testid="calendar-day-view"
      aria-label={`Calendar for ${day.dateLabel}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {day.dateLabel}
          </p>
        </div>
        {actionHref && actionLabel ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0"
            data-testid={actionTestId}
          >
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyDay isToday={isToday} />
        ) : (
          <div className="flex flex-col gap-4 px-5 py-4">
            {allDayEvents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  All day
                </p>
                <ul className="space-y-2">
                  {allDayEvents.map((event) => (
                    <li key={event.id}>
                      <DayEventChip event={event} allDay />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {timedEvents.length > 0 ? (
              <div className="space-y-2">
                {allDayEvents.length > 0 ? (
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Schedule
                  </p>
                ) : null}
                <ol className="relative space-y-0">
                  {timedEvents.map((event, index) => {
                    const showNowBefore =
                      isToday &&
                      nowHour < event.startHour &&
                      (index === 0 ||
                        nowHour >= timedEvents[index - 1]!.endHour);

                    return (
                      <li key={event.id}>
                        {showNowBefore ? <NowMarker /> : null}
                        <AgendaEvent event={event} />
                        {isToday &&
                        nowHour >= event.startHour &&
                        nowHour < event.endHour ? (
                          <NowMarker embedded />
                        ) : null}
                      </li>
                    );
                  })}
                  {isToday &&
                  nowHour >= timedEvents[timedEvents.length - 1]!.endHour ? (
                    <NowMarker />
                  ) : null}
                </ol>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyDay({ isToday }: { isToday: boolean }) {
  return (
    <div
      className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center"
      data-testid="calendar-day-empty"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CalendarDays className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">
        {isToday ? "Nothing on the calendar today" : "Nothing scheduled"}
      </p>
    </div>
  );
}

function NowMarker({ embedded = false }: { embedded?: boolean }) {
  return (
    <div
      className={cn("flex items-center gap-2", embedded ? "my-1.5" : "py-2")}
      aria-hidden="true"
      data-testid="calendar-now-line"
    >
      <span className="text-[10px] font-semibold tracking-wide text-rose-600 uppercase">
        Now
      </span>
      <span className="h-px flex-1 bg-rose-500/70" />
    </div>
  );
}

function AgendaEvent({ event }: { event: CalendarDayEvent }) {
  const timeLabel =
    event.endHour > event.startHour
      ? `${formatCalendarHourLabel(event.startHour)} – ${formatCalendarHourLabel(event.endHour)}`
      : formatCalendarHourLabel(event.startHour);

  const inner = (
    <>
      <p className="pt-0.5 text-right text-xs tabular-nums text-muted-foreground">
        {formatCalendarHourLabel(event.startHour)}
      </p>
      <div
        className={cn(
          "rounded-xl border px-3 py-2.5 shadow-sm",
          event.readonly
            ? "border-dashed border-muted-foreground/50 bg-muted/40"
            : "border-border/80 bg-background",
        )}
      >
        <p className="truncate text-sm font-semibold leading-snug">
          {event.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {timeLabel}
          {event.readonly ? " · Subscription" : ""}
        </p>
      </div>
    </>
  );

  if (event.href) {
    return (
      <Link
        href={event.href}
        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2.5"
        data-testid={`calendar-event-${event.id}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2.5"
      data-testid={`calendar-event-${event.id}`}
    >
      {inner}
    </div>
  );
}

function DayEventChip({
  event,
  allDay,
}: {
  event: CalendarDayEvent;
  allDay?: boolean;
}) {
  const className = cn(
    "block rounded-xl px-3 py-2.5 text-sm font-medium",
    event.readonly
      ? "border border-dashed border-muted-foreground/50 text-muted-foreground"
      : "bg-muted/70",
  );
  const testId = allDay
    ? `calendar-all-day-${event.id}`
    : `calendar-event-${event.id}`;
  const label = event.readonly ? `${event.title} (Subscription)` : event.title;

  if (event.href) {
    return (
      <Link href={event.href} className={className} data-testid={testId}>
        {label}
      </Link>
    );
  }

  return (
    <div className={className} data-testid={testId}>
      {label}
    </div>
  );
}
