import type { Metadata } from "next";
import { Wallet } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Budget",
};

export default function BudgetPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Budget"
        description="Track monthly income, bills, and spending."
      />
      <EmptyState
        icon={Wallet}
        title="Coming soon"
        description="Monthly summaries and expenses will live here."
      />
    </div>
  );
}
