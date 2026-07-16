import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Recipes",
};

export default function RecipesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recipes"
        description="Keep your household recipes in one place."
      />
      <EmptyState
        icon={BookOpen}
        title="Coming soon"
        description="Your recipe collection will appear here."
      />
    </div>
  );
}
