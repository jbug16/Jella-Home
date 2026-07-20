import type { Metadata } from "next";

import { CalendarDayView } from "@/components/calendar/day-view";
import { PageHeader } from "@/components/common/page-header";
import { buildCalendarDayViewModel } from "@/lib/domain/calendar";
import { todayIsoDate } from "@/lib/domain/dates";

export const metadata: Metadata = {
  title: "Calendar",
};

/**
 * Shared household calendar. Day view is the same component the Dashboard
 * Today panel uses. Event create/edit arrives with the Calendar milestone.
 */
export default function CalendarPage() {
  const day = buildCalendarDayViewModel({
    dateIso: todayIsoDate(),
    events: [],
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Shared household events — separate from meal planning."
      />
      <CalendarDayView
        day={day}
        fillHeight={false}
        className="min-h-[18rem] max-w-3xl"
      />
    </div>
  );
}
