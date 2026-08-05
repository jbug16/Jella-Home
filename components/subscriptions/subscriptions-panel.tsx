"use client";

import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { DeleteSubscriptionDialog } from "@/components/subscriptions/delete-subscription-dialog";
import { SubscriptionFormDialog } from "@/components/subscriptions/subscription-form-dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
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
  Pencil,
  Shield,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";

type SubscriptionsPanelProps = {
  viewModel: SubscriptionsViewModel;
};

/** Known seed / workbook labels → icon + color (case-insensitive match). */
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
    <li
      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
            visual.className,
          )}
          aria-label={categoryAriaLabel}
        >
          <CategoryIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{item.vendor}</p>
          <p className="text-sm font-medium tabular-nums text-foreground">
            {item.billingLabel}
          </p>
          {item.renewalOn ? (
            <p className="text-sm text-muted-foreground">
              Next billing{" "}
              <time dateTime={item.renewalOn}>
                {formatIsoDateUs(item.renewalOn)}
              </time>{" "}
              ({formatRelativeDayPhrase(item.renewalOn, todayIso)})
            </p>
          ) : null}
          {item.notes.trim() ? (
            <p className="text-sm text-muted-foreground">{item.notes}</p>
          ) : null}
        </div>
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
                    todayIso={todayIso}
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
