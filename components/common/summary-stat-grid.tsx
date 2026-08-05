import { cn } from "@/lib/utils";

type SummaryStatProps = {
  label: string;
  value: string;
  testId: string;
  valueClassName?: string;
};

/** Single stat cell — use inside SummaryStatGrid for consistent financial summaries. */
export function SummaryStat({
  label,
  value,
  testId,
  valueClassName,
}: SummaryStatProps) {
  return (
    <div className="min-w-0 px-2 py-2 text-center sm:px-3 sm:py-3">
      <p className="text-[11px] leading-none text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums tracking-tight sm:text-lg",
          valueClassName,
        )}
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  );
}

type SummaryStatGridProps = {
  children: React.ReactNode;
  /** Screen-reader heading id for the surrounding section. */
  headingId?: string;
  className?: string;
};

/** Three-up stat row used on budget, subscriptions, and similar summaries. */
export function SummaryStatGrid({
  children,
  headingId,
  className,
}: SummaryStatGridProps) {
  return (
    <div
      className={cn("grid grid-cols-3 divide-x rounded-lg border", className)}
      {...(headingId ? { "aria-labelledby": headingId } : {})}
    >
      {children}
    </div>
  );
}
