import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CalendarPanel } from "@/components/calendar/calendar-panel";
import { PageHeader } from "@/components/common/page-header";
import { getCalendarRangeViewModel } from "@/lib/calendar/get-calendar-range-view-model";
import { monthStartFor } from "@/lib/domain/budget";
import { todayIsoDate } from "@/lib/domain/dates";
import { resolveWeekStartParam } from "@/lib/domain/meal-plan";
import { CALENDAR_ENABLED } from "@/lib/features/calendar";

export const metadata: Metadata = {
  title: "Calendar",
};

type CalendarPageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  if (!CALENDAR_ENABLED) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const weekStart = resolveWeekStartParam(params.week);

  // Canonicalize ?week= to the Sunday for that week (same pattern as meals).
  if (params.week !== weekStart) {
    redirect(`/calendar?week=${weekStart}`);
  }

  const todayIso = todayIsoDate();
  const monthStart = monthStartFor(weekStart);

  const viewModel = await getCalendarRangeViewModel({
    view: "week",
    weekStart,
    monthStart,
    selectedDay: weekStart,
  });

  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden sidebar:gap-6">
      <PageHeader title="Calendar" />
      <CalendarPanel
        weekStart={weekStart}
        todayIso={todayIso}
        events={viewModel.events}
        occurrences={viewModel.occurrences}
      />
    </div>
  );
}
