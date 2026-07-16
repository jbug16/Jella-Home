import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="A shared overview of your household."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Coming soon"
        description="Your household summary will appear here once the first features are ready."
      />
    </div>
  );
}
