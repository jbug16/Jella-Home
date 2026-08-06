import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { SubscriptionsPanel } from "@/components/subscriptions/subscriptions-panel";
import { todayIsoDate } from "@/lib/domain/dates";
import { buildSubscriptionsViewModel } from "@/lib/domain/subscription";
import { listSubscriptions } from "@/lib/repositories/subscriptions";

export const metadata: Metadata = {
  title: "Subscriptions",
};

export default async function SubscriptionsPage() {
  const todayIso = todayIsoDate();
  const subscriptions = await listSubscriptions();
  const viewModel = buildSubscriptionsViewModel(subscriptions, todayIso);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3 sidebar:gap-6">
      <PageHeader title="Subscriptions" />
      <SubscriptionsPanel viewModel={viewModel} />
    </div>
  );
}
