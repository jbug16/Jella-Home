import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardCardShellProps = {
  id: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  actionTestId?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

/** Consistent summary card shell for the Dashboard home. */
export function DashboardCardShell({
  id,
  title,
  description,
  actionHref,
  actionLabel,
  actionTestId,
  children,
  className,
  compact = false,
}: DashboardCardShellProps) {
  const titleId = `${id}-title`;

  return (
    <Card
      className={cn(compact ? "gap-3 py-4" : "gap-4 py-5", className)}
      data-testid={id}
      aria-labelledby={titleId}
    >
      <CardHeader className="px-5 pb-0">
        <h2
          id={titleId}
          className="text-base leading-none font-semibold tracking-tight"
        >
          {title}
        </h2>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {actionHref && actionLabel ? (
          <CardAction>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11"
              data-testid={actionTestId}
            >
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}
