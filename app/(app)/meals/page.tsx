import type { Metadata } from "next";
import { UtensilsCrossed } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Meals",
};

export default function MealsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Meals" description="Plan meals across the week." />
      <EmptyState
        icon={UtensilsCrossed}
        title="Coming soon"
        description="Your weekly meal planner will appear here."
      />
    </div>
  );
}
