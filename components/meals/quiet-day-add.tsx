"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type QuietDayAddProps = {
  /** Full accessible label, e.g. "Plan a meal for Tue 14". */
  label: string;
  testId: string;
  onAdd: () => void;
  className?: string;
};

/**
 * Icon-only per-day add — muted at rest so the header CTA stays primary.
 * Always visible for touch; strengthens on hover/focus for pointer users.
 */
export function QuietDayAdd({
  label,
  testId,
  onAdd,
  className,
}: QuietDayAddProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 w-full items-center justify-center rounded-lg",
        "text-muted-foreground/40 transition-colors",
        "hover:bg-muted/50 hover:text-muted-foreground",
        "focus-visible:bg-muted/50 focus-visible:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={label}
      data-testid={testId}
      onClick={onAdd}
    >
      <Plus className="size-3.5" aria-hidden />
    </button>
  );
}
