import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CalendarPanel } from "@/components/calendar/calendar-panel";
import { PageHeader } from "@/components/common/page-header";
import { getCalendarRangeViewModel } from "@/lib/calendar/get-calendar-range-view-model";
import { currentMonthStart, monthStartFor } from "@/lib/domain/budget";
import { isValidIsoDate, todayIsoDate } from "@/lib/domain/dates";
import {
  currentWeekStart,
  resolveWeekStartParam,
  weekEndOn,
  weekStartOn,
} from "@/lib/domain/meal-plan";

export const metadata: Metadata = {
  title: "Calendar",
};

type CalendarPageProps = {
  searchParams: Promise<{
    view?: string;
    week?: string;
    month?: string;
    day?: string;
  }>;
};

function resolveView(raw: string | undefined): "week" | "month" {
  return raw === "month" ? "month" : "week";
}

function resolveSelectedDay(args: {
  raw: string | undefined;
  view: "week" | "month";
  weekStart: string;
  monthStart: string;
  todayIso: string;
}): string {
  if (args.raw && isValidIsoDate(args.raw)) {
    return args.raw;
  }
  if (args.view === "week") {
    const weekEnd = weekEndOn(args.weekStart);
    const inWeek = args.todayIso >= args.weekStart && args.todayIso <= weekEnd;
    return inWeek ? args.todayIso : args.weekStart;
  }
  const monthPrefix = args.monthStart.slice(0, 7);
  if (args.todayIso.startsWith(monthPrefix)) {
    return args.todayIso;
  }
  return args.monthStart;
}

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const params = await searchParams;
  const todayIso = todayIsoDate();
  const view = resolveView(params.view);
  const weekStart = resolveWeekStartParam(params.week);
  const monthStart = params.month
    ? monthStartFor(
        isValidIsoDate(params.month)
          ? params.month
          : /^\d{4}-\d{2}$/.test(params.month)
            ? `${params.month}-01`
            : currentMonthStart(),
      )
    : currentMonthStart();

  const selectedDay = resolveSelectedDay({
    raw: params.day,
    view,
    weekStart,
    monthStart,
    todayIso,
  });

  const canonicalWeek = weekStartOn(selectedDay);
  const canonicalMonth = monthStartFor(selectedDay);

  // Keep week/month aligned with selected day when navigating.
  const alignedWeek = view === "week" ? weekStart : canonicalWeek;
  const alignedMonth = view === "month" ? monthStart : canonicalMonth;

  const query = new URLSearchParams({
    view,
    week: alignedWeek,
    month: alignedMonth.slice(0, 7),
    day: selectedDay,
  });
  const expected = `/calendar?${query.toString()}`;
  const currentWeek = params.week ?? "";
  const currentMonth = params.month ?? "";
  const currentDay = params.day ?? "";
  const currentView = params.view ?? "week";

  if (
    currentView !== view ||
    currentWeek !== alignedWeek ||
    currentMonth !== alignedMonth.slice(0, 7) ||
    currentDay !== selectedDay
  ) {
    redirect(expected);
  }

  const viewModel = await getCalendarRangeViewModel({
    view,
    weekStart: alignedWeek,
    monthStart: alignedMonth,
    selectedDay,
  });

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
      <PageHeader
        title="Calendar"
        description="Shared household events — separate from meal planning."
      />
      <CalendarPanel
        viewModel={viewModel}
        todayIso={todayIso}
        thisWeekStart={currentWeekStart()}
        thisMonthStart={currentMonthStart()}
      />
    </div>
  );
}
