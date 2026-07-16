import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Shopping",
};

export default function ShoppingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shopping"
        description="Build and check off your shopping list."
      />
      <EmptyState
        icon={ShoppingCart}
        title="Coming soon"
        description="Your shopping list will appear here."
      />
    </div>
  );
}
