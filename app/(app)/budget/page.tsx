import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BudgetPanel } from "@/components/budget/budget-panel";
import { PageHeader } from "@/components/common/page-header";
import {
  buildBudgetMonthSnapshot,
  buildBudgetYearSnapshot,
  resolveBudgetPeriod,
  todayIsoDate,
} from "@/lib/domain/budget";
import {
  listCategories,
  listCategoryDisplayMap,
  listMonthLimits,
  listTransactionsForMonth,
  listTransactionsForYear,
} from "@/lib/repositories/budget";

export const metadata: Metadata = {
  title: "Budget",
};

type BudgetPageProps = {
  searchParams: Promise<{ view?: string; month?: string; year?: string }>;
};

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const params = await searchParams;
  const period = resolveBudgetPeriod(params);
  const incoming = new URLSearchParams();
  if (params.view) incoming.set("view", params.view);
  if (params.month) incoming.set("month", params.month);
  if (params.year) incoming.set("year", params.year);
  if (incoming.toString() !== period.canonicalQuery) {
    redirect(`/budget?${period.canonicalQuery}`);
  }
  const todayIso = todayIsoDate();

  if (period.view === "year") {
    const [allCategories, transactions, categoryDisplayById] =
      await Promise.all([
        listCategories({ includeArchived: true }),
        listTransactionsForYear(period.year),
        listCategoryDisplayMap(),
      ]);
    const activeCategories = allCategories.filter(
      (row) => row.archivedAt === null,
    );
    return (
      <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden sidebar:gap-6">
        <PageHeader title="Budget" />
        <BudgetPanel
          period={period}
          todayIso={todayIso}
          categories={activeCategories}
          categoryDisplayById={categoryDisplayById}
          transactions={transactions}
          yearSnapshot={buildBudgetYearSnapshot({
            year: period.year,
            categories: allCategories,
            transactions,
          })}
        />
      </div>
    );
  }

  const monthStart = period.monthStart;

  const [categories, limits, transactions, categoryDisplayById] =
    await Promise.all([
      listCategories(),
      listMonthLimits(monthStart),
      listTransactionsForMonth(monthStart),
      listCategoryDisplayMap(),
    ]);

  const snapshot = buildBudgetMonthSnapshot({
    monthStart,
    categories,
    limits,
    transactions,
  });

  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden sidebar:gap-6">
      <PageHeader title="Budget" />
      <BudgetPanel
        period={period}
        todayIso={todayIso}
        categories={categories}
        categoryDisplayById={categoryDisplayById}
        transactions={transactions}
        monthSnapshot={snapshot}
      />
    </div>
  );
}
