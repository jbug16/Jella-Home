import { cn } from "@/lib/utils";

type DayAgendaProps = {
  children: React.ReactNode;
  testId: string;
  className?: string;
};

/** Week-at-a-glance list for phone layouts (meals, calendar). */
export function DayAgenda({ children, testId, className }: DayAgendaProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col divide-y rounded-lg border",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

type DayAgendaSectionProps = {
  id: string;
  dayLabel: string;
  isToday: boolean;
  itemCount: number;
  emptyText: string;
  testId: string;
  children?: React.ReactNode;
};

export function DayAgendaSection({
  id,
  dayLabel,
  isToday,
  itemCount,
  emptyText,
  testId,
  children,
}: DayAgendaSectionProps) {
  const filled = itemCount > 0;

  return (
    <section
      id={id}
      className={cn("scroll-mt-16 px-3 py-2", isToday ? "bg-muted/20" : null)}
      data-testid={testId}
    >
      <DayAgendaHeader
        dayLabel={dayLabel}
        isToday={isToday}
        itemCount={filled ? itemCount : undefined}
      />
      {filled ? (
        <div className="flex flex-col gap-1">{children}</div>
      ) : (
        <p className="px-0.5 text-xs text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}

type DayAgendaHeaderProps = {
  dayLabel: string;
  isToday: boolean;
  itemCount?: number;
};

export function DayAgendaHeader({
  dayLabel,
  isToday,
  itemCount,
}: DayAgendaHeaderProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <h3
        className={cn(
          "text-xs font-semibold tracking-wide uppercase",
          isToday ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {dayLabel}
      </h3>
      {isToday ? <TodayBadge /> : null}
      {itemCount != null ? (
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {itemCount}
        </span>
      ) : null}
    </div>
  );
}

export function TodayBadge() {
  return (
    <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
      Today
    </span>
  );
}
