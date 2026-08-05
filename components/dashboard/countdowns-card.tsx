"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CountdownFormDialog } from "@/components/dashboard/countdown-form-dialog";
import { DeleteCountdownDialog } from "@/components/dashboard/delete-countdown-dialog";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import {
  COUNTDOWN_COLOR_STYLES,
  DASHBOARD_COUNTDOWN_LIMIT,
  type CountdownListItem,
  type CountdownsCardViewModel,
} from "@/lib/domain/countdown";
import { cn } from "@/lib/utils";

/** Fixed height keeps countdown and add tiles identical in the grid. */
const TILE_HEIGHT = "h-[6.75rem]";

type CountdownsCardProps = {
  countdowns: CountdownsCardViewModel;
};

function CountdownTile({
  item,
  onEdit,
}: {
  item: CountdownListItem;
  onEdit: () => void;
}) {
  const styles = COUNTDOWN_COLOR_STYLES[item.color];

  return (
    <li
      className="min-w-0 list-none"
      data-testid={`dashboard-countdown-${item.id}`}
    >
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          TILE_HEIGHT,
          "flex w-full flex-col items-center justify-center rounded-lg border px-2 text-center",
          styles.tile,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={`Edit ${item.title} countdown`}
      >
        <p
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            styles.number,
          )}
          data-testid="dashboard-countdown-headline"
        >
          {item.headline}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em]",
            styles.unit,
          )}
        >
          {item.unitLabel}
        </p>
        <p className="mt-2 w-full truncate text-xs font-semibold leading-snug text-foreground">
          {item.title}
        </p>
        <time
          dateTime={item.targetOn}
          className="mt-0.5 w-full truncate text-[11px] text-muted-foreground"
        >
          {item.dateLabel}
        </time>
        <span className="sr-only"> ({item.relativePhrase})</span>
      </button>
    </li>
  );
}

function AddCountdownTile({ onClick }: { onClick: () => void }) {
  return (
    <li className="min-w-0 list-none">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          TILE_HEIGHT,
          "flex w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 text-muted-foreground/60 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        data-testid="dashboard-add-countdown"
        aria-label="Add countdown"
      >
        <Plus className="size-5" aria-hidden />
      </button>
    </li>
  );
}

export function CountdownsCard({ countdowns }: CountdownsCardProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeCountdown, setActiveCountdown] =
    useState<CountdownListItem | null>(null);

  function openCreate() {
    setActiveCountdown(null);
    setFormOpen(true);
  }

  function openEdit(item: CountdownListItem) {
    setActiveCountdown(item);
    setFormOpen(true);
  }

  function openDelete() {
    setFormOpen(false);
    setDeleteOpen(true);
  }

  return (
    <>
      <DashboardCardShell id="card-countdowns" title="Countdowns" compact>
        <ul
          className="grid grid-cols-2 gap-2"
          data-testid="dashboard-countdowns"
        >
          {countdowns.items.map((item) => (
            <CountdownTile
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
            />
          ))}
          {countdowns.items.length < DASHBOARD_COUNTDOWN_LIMIT ? (
            <AddCountdownTile onClick={openCreate} />
          ) : null}
        </ul>
      </DashboardCardShell>

      <CountdownFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        todayIso={countdowns.todayIso}
        countdown={activeCountdown}
        onDelete={activeCountdown ? openDelete : undefined}
      />

      <DeleteCountdownDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        countdown={activeCountdown}
      />
    </>
  );
}
