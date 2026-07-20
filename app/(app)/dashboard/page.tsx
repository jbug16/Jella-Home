import type { Metadata } from "next";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { getDashboardViewModel } from "@/lib/dashboard/get-dashboard-view-model";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const viewModel = await getDashboardViewModel();

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden sidebar:h-full sidebar:overflow-hidden"
      data-testid="dashboard-page"
    >
      <h1 className="sr-only">Dashboard</h1>
      <DashboardPanel viewModel={viewModel} />
    </div>
  );
}
