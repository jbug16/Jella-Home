import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MealsPanel } from "@/components/meals/meals-panel";
import { PageHeader } from "@/components/common/page-header";
import { todayIsoDate } from "@/lib/domain/dates";
import { resolveWeekStartParam } from "@/lib/domain/meal-plan";
import { listPlannedMealsForWeek } from "@/lib/repositories/meal-plans";
import { listRecipes } from "@/lib/repositories/recipes";

export const metadata: Metadata = {
  title: "Meals",
};

type MealsPageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function MealsPage({ searchParams }: MealsPageProps) {
  const params = await searchParams;
  const weekStart = resolveWeekStartParam(params.week);

  // Canonicalize ?week= to the Sunday for that week (or current week when
  // missing/invalid). Avoids ambiguous mid-week URLs without error pages.
  if (params.week !== weekStart) {
    redirect(`/meals?week=${weekStart}`);
  }

  const todayIso = todayIsoDate();

  const [meals, recipes] = await Promise.all([
    listPlannedMealsForWeek(weekStart),
    listRecipes({ sort: "name" }),
  ]);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3 sidebar:gap-6">
      <PageHeader title="Meals" />
      <MealsPanel
        weekStart={weekStart}
        todayIso={todayIso}
        meals={meals}
        recipes={recipes}
      />
    </div>
  );
}
