"use client";

import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import {
  ListRowBody,
  ListRowButton,
  ListRowMeta,
  ListRowTitle,
} from "@/components/common/list-row";
import { PanelList, PanelListItem } from "@/components/common/panel-list";
import { PrimaryAddButton } from "@/components/common/primary-add-button";
import { RowEditDeleteActions } from "@/components/common/row-edit-delete-actions";
import { SummaryStat } from "@/components/common/summary-stat-grid";
import { SummaryStatRow } from "@/components/common/summary-stat-row";
import { DeleteSubscriptionDialog } from "@/components/subscriptions/delete-subscription-dialog";
import { SubscriptionFormDialog } from "@/components/subscriptions/subscription-form-dialog";
import { formatCents } from "@/lib/domain/budget";
import { formatIsoDateUs, formatRelativeDayPhrase } from "@/lib/domain/dates";
import type {
  SubscriptionListItem,
  SubscriptionsViewModel,
} from "@/lib/domain/subscription";
import { cn } from "@/lib/utils";
import {
  Clapperboard,
  Cpu,
  CreditCard,
  PawPrint,
  Shield,
  Tag,
  type LucideIcon,
} from "lucide-react";

type SubscriptionsPanelProps = {
  viewModel: SubscriptionsViewModel;
};

const CATEGORY_VISUALS: Record<
  string,
  { icon: LucideIcon; className: string }
> = {
  entertainment: {
    icon: Clapperboard,
    className: "bg-violet-100 text-violet-700",
  },
  tech: {
    icon: Cpu,
    className: "bg-sky-100 text-sky-700",
  },
  insurance: {
    icon: Shield,
    className: "bg-emerald-100 text-emerald-700",
  },
  pets: {
    icon: PawPrint,
    className: "bg-amber-100 text-amber-800",
  },
};

const FALLBACK_CATEGORY_VISUAL = {
  icon: Tag,
  className: "bg-muted text-muted-foreground",
};

function categoryVisual(categoryLabel: string) {
  const key = categoryLabel.trim().toLowerCase();
  if (!key) {
    return FALLBACK_CATEGORY_VISUAL;
  }
  return CATEGORY_VISUALS[key] ?? FALLBACK_CATEGORY_VISUAL;
}

function SubscriptionRow({
  item,
  todayIso,
  testId,
  onEdit,
  onDelete,
}: {
  item: SubscriptionListItem;
  todayIso: string;
  testId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const visual = categoryVisual(item.categoryLabel);
  const CategoryIcon = visual.icon;
  const categoryAriaLabel = item.categoryLabel.trim() || "Uncategorized";

  return (
    <PanelListItem testId={testId}>
      <ListRowButton
        onClick={onEdit}
        className="items-start py-3 sm:items-center"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            visual.className,
          )}
          aria-label={categoryAriaLabel}
        >
          <CategoryIcon className="size-4" aria-hidden />
        </span>
        <ListRowBody className="space-y-0.5">
          <ListRowTitle>{item.vendor}</ListRowTitle>
          <p className="text-sm font-semibold tabular-nums">
            {item.billingLabel}
          </p>
          {item.renewalOn ? (
            <ListRowMeta>
              Renews{" "}
              <time dateTime={item.renewalOn}>
                {formatIsoDateUs(item.renewalOn)}
              </time>
              {" · "}
              {formatRelativeDayPhrase(item.renewalOn, todayIso)}
            </ListRowMeta>
          ) : null}
        </ListRowBody>
      </ListRowButton>
      <RowEditDeleteActions
        className="hidden shrink-0 pr-3 sm:flex"
        onEdit={onEdit}
        onDelete={onDelete}
        editLabel="Edit subscription"
        deleteLabel="Delete subscription"
        deleteTestId={`delete-subscription-${item.id}`}
      />
    </PanelListItem>
  );
}

export function SubscriptionsPanel({ viewModel }: SubscriptionsPanelProps) {
  const { todayIso, active, summary } = viewModel;
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionListItem | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionListItem | null>(null);

  const isEmpty = summary.activeCount === 0;
  const hasActive = summary.activeCount > 0;

  return (
    <div
      className="flex min-w-0 max-w-full flex-col gap-3"
      data-testid="subscriptions-panel"
    >
      {!isEmpty ? (
        <section aria-labelledby="subscriptions-summary-heading">
          <h2 id="subscriptions-summary-heading" className="sr-only">
            Summary
          </h2>
          <SummaryStatRow
            headingId="subscriptions-summary-heading"
            action={
              <PrimaryAddButton
                label="Add subscription"
                stretch
                onClick={() => setAddOpen(true)}
                data-testid="open-add-subscription"
              />
            }
          >
            <SummaryStat
              label="Monthly"
              value={formatCents(summary.monthlyTotalCents)}
              testId="summary-monthly-total"
            />
            <SummaryStat
              label="Yearly"
              value={formatCents(summary.yearlyTotalCents)}
              testId="summary-yearly-total"
            />
            <SummaryStat
              label="Active"
              value={String(summary.activeCount)}
              testId="summary-active-count"
            />
          </SummaryStatRow>
        </section>
      ) : null}

      {isEmpty ? (
        <>
          <EmptyState
            icon={CreditCard}
            title="No subscriptions yet"
            description="Add a recurring expense to track monthly cost and upcoming charges."
          />
          <PrimaryAddButton
            label="Add subscription"
            onClick={() => setAddOpen(true)}
            data-testid="open-add-subscription"
          />
        </>
      ) : (
        <>
          {hasActive ? (
            <section
              aria-labelledby="subscriptions-list-heading"
              data-testid="subscriptions-list"
            >
              <h2 id="subscriptions-list-heading" className="sr-only">
                Active subscriptions
              </h2>
              <PanelList aria-labelledby="subscriptions-list-heading">
                {active.map((item) => (
                  <SubscriptionRow
                    key={item.id}
                    item={item}
                    todayIso={todayIso}
                    testId={`subscription-row-${item.id}`}
                    onEdit={() => setEditing(item)}
                    onDelete={() => setDeleting(item)}
                  />
                ))}
              </PanelList>
            </section>
          ) : null}
        </>
      )}

      <SubscriptionFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        todayIso={todayIso}
      />
      <SubscriptionFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        todayIso={todayIso}
        subscription={editing}
        onDelete={() => {
          if (editing) {
            setDeleting(editing);
            setEditing(null);
          }
        }}
      />
      <DeleteSubscriptionDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        subscription={deleting}
      />
    </div>
  );
}
