import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Calendar" description="Shared household events." />
      <EmptyState
        icon={CalendarDays}
        title="Coming soon"
        description="Your shared calendar will appear here."
      />
    </div>
  );
}
