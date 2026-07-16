import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Subscriptions",
};

export default function SubscriptionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subscriptions"
        description="Track recurring costs and renewals."
      />
      <EmptyState
        icon={CreditCard}
        title="Coming soon"
        description="Your subscriptions will appear here."
      />
    </div>
  );
}
