import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { ShoppingPanel } from "@/components/shopping/shopping-panel";
import { resolveShoppingWeekStart } from "@/lib/domain/shopping";
import {
  getGroceryListForWeek,
  listGroceryItems,
} from "@/lib/repositories/shopping";

export const metadata: Metadata = {
  title: "Shopping",
};

type ShoppingPageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function ShoppingPage({
  searchParams,
}: ShoppingPageProps) {
  const params = await searchParams;
  const weekStart = resolveShoppingWeekStart(params.week);

  if (params.week !== weekStart) {
    redirect(`/shopping?week=${weekStart}`);
  }

  const list = await getGroceryListForWeek(weekStart);
  const items = list ? await listGroceryItems(list.id) : [];

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
      <PageHeader title="Shopping" />
      <ShoppingPanel weekStart={weekStart} list={list} items={items} />
    </div>
  );
}
