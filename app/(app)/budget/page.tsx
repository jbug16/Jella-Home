import type { Metadata } from "next";

import { BudgetPanel } from "@/components/budget/budget-panel";
import { PageHeader } from "@/components/common/page-header";
import {
  buildBudgetMonthSnapshot,
  currentMonthStart,
  todayIsoDate,
} from "@/lib/domain/budget";
import { resolveMonthStartParam } from "@/lib/domain/dates";
import {
  listCategories,
  listCategoryDisplayMap,
  listMonthLimits,
  listTransactionsForMonth,
} from "@/lib/repositories/budget";

export const metadata: Metadata = {
  title: "Budget",
};

type BudgetPageProps = {
  searchParams: Promise<{ month?: string }>;
};

function resolveMonthStart(raw: string | undefined): string {
  return resolveMonthStartParam(raw) ?? currentMonthStart();
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const params = await searchParams;
  const monthStart = resolveMonthStart(params.month);
  const todayIso = todayIsoDate();

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
        monthStart={monthStart}
        todayIso={todayIso}
        categories={categories}
        categoryDisplayById={categoryDisplayById}
        transactions={transactions}
        snapshot={snapshot}
      />
    </div>
  );
}
