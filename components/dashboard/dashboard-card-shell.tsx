import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardCardShellProps = {
  id: string;
  title: string;
  description?: string;
  /** Tap anywhere on the card (except nested links) to navigate here. */
  href?: string;
  linkLabel?: string;
  linkTestId?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  /** Scroll long body content inside the card instead of growing past it. */
  scrollBody?: boolean;
};

/** Consistent summary card shell for the Dashboard home. */
export function DashboardCardShell({
  id,
  title,
  description,
  href,
  linkLabel,
  linkTestId,
  children,
  className,
  compact = false,
  scrollBody = false,
}: DashboardCardShellProps) {
  const titleId = `${id}-title`;

  return (
    <Card
      className={cn(
        "relative",
        compact ? "gap-2 py-3 sm:gap-3 sm:py-4" : "gap-4 py-5",
        scrollBody ? "min-h-0 overflow-hidden" : null,
        href ? "transition-colors hover:bg-muted/20" : null,
        className,
      )}
      data-testid={id}
      aria-labelledby={titleId}
    >
      {href ? (
        <Link
          href={href}
          className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={linkLabel ?? `Open ${title}`}
          data-testid={linkTestId}
        />
      ) : null}
      <CardHeader className="relative z-10 grid-cols-1 items-center gap-y-0 px-3 pb-0 sm:px-5">
        <h2
          id={titleId}
          className="text-sm leading-none font-semibold tracking-tight sm:text-base"
        >
          {title}
        </h2>
        {description ? (
          <CardDescription className="mt-1">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "relative z-10 min-h-0 px-3 sm:px-5",
          scrollBody ? "flex-1 overflow-y-auto" : null,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
