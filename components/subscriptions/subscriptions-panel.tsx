"use client";

import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { DeleteSubscriptionDialog } from "@/components/subscriptions/delete-subscription-dialog";
import { SubscriptionFormDialog } from "@/components/subscriptions/subscription-form-dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { formatCents } from "@/lib/domain/budget";
import type {
  SubscriptionListItem,
  SubscriptionsViewModel,
} from "@/lib/domain/subscription";
import { CreditCard, Pencil, Trash2 } from "lucide-react";

type SubscriptionsPanelProps = {
  viewModel: SubscriptionsViewModel;
};

function SummaryStat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight"
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  );
}

function SubscriptionRow({
  item,
  testId,
  onEdit,
  onDelete,
}: {
  item: SubscriptionListItem;
  testId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
      data-testid={testId}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{item.vendor}</p>
        <p className="text-sm font-medium tabular-nums text-foreground">
          {item.billingLabel}
        </p>
        {item.renewalOn ? (
          <p className="text-sm text-muted-foreground">
            Next billing <time dateTime={item.renewalOn}>{item.renewalOn}</time>
          </p>
        ) : null}
        {item.categoryLabel ? (
          <p className="text-sm text-muted-foreground">{item.categoryLabel}</p>
        ) : null}
        {item.notes.trim() ? (
          <p className="text-sm text-muted-foreground">{item.notes}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <IconButton label="Edit subscription" variant="ghost" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
        <IconButton
          label="Delete subscription"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden />
        </IconButton>
      </div>
    </li>
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
    <div className="flex flex-col gap-5" data-testid="subscriptions-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground">
            Recurring costs by next charge date.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 shrink-0"
          onClick={() => setAddOpen(true)}
          data-testid="open-add-subscription"
        >
          Add
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Add a recurring expense to track monthly cost and upcoming charges."
        />
      ) : (
        <>
          <section
            aria-labelledby="subscriptions-summary-heading"
            className="space-y-2"
          >
            <h2 id="subscriptions-summary-heading" className="sr-only">
              Summary
            </h2>
            <div className="grid grid-cols-3 gap-2">
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
            </div>
          </section>

          {hasActive ? (
            <section
              aria-labelledby="subscriptions-list-heading"
              data-testid="subscriptions-list"
            >
              <h2 id="subscriptions-list-heading" className="sr-only">
                Active subscriptions
              </h2>
              <ul
                className="divide-y rounded-lg border"
                aria-labelledby="subscriptions-list-heading"
              >
                {active.map((item) => (
                  <SubscriptionRow
                    key={item.id}
                    item={item}
                    testId={`subscription-row-${item.id}`}
                    onEdit={() => setEditing(item)}
                    onDelete={() => setDeleting(item)}
                  />
                ))}
              </ul>
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
