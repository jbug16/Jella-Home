import type { Metadata } from "next";

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

  return <SubscriptionsPanel viewModel={viewModel} />;
}
