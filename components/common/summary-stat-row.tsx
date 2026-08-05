import type { ReactNode } from "react";

import { SummaryStatGrid } from "@/components/common/summary-stat-grid";
import { cn } from "@/lib/utils";

type SummaryStatRowProps = {
  children: ReactNode;
  headingId?: string;
  className?: string;
  action?: ReactNode;
};

/** Summary stats with an optional action control matched to the row height. */
export function SummaryStatRow({
  action,
  children,
  className,
  headingId,
}: SummaryStatRowProps) {
  return (
    <div className="flex items-stretch gap-2">
      <SummaryStatGrid
        headingId={headingId}
        className={cn("min-w-0 flex-1", className)}
      >
        {children}
      </SummaryStatGrid>
      {action ? (
        <div className="flex shrink-0 items-stretch">{action}</div>
      ) : null}
    </div>
  );
}
