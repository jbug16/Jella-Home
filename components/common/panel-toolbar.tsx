import { cn } from "@/lib/utils";

type PanelToolbarProps = {
  children: React.ReactNode;
  /** When actions stack above vs beside the navigator on large screens only. */
  breakpoint?: "lg" | "sidebar";
  className?: string;
};

const breakpointClasses = {
  lg: "lg:items-start lg:justify-between lg:gap-3",
  sidebar: "sidebar:items-start sidebar:justify-between",
} as const;

/** Top-of-panel row: period navigator and primary actions share one horizontal row on phones. */
export function PanelToolbar({
  children,
  breakpoint = "lg",
  className,
}: PanelToolbarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-row items-center justify-between gap-2",
        breakpointClasses[breakpoint],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelToolbarLeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0 flex-1", className)}>{children}</div>;
}

export function PanelToolbarActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {children}
    </div>
  );
}
