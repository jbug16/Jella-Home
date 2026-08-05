import Link from "next/link";

import { cn } from "@/lib/utils";

/** Shared horizontal padding and touch height for tappable list rows. */
export const listRowButtonClassName =
  "flex w-full min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4";

type ListRowButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  testId?: string;
  disabled?: boolean;
};

export function ListRowButton({
  children,
  onClick,
  className,
  testId,
  disabled,
}: ListRowButtonProps) {
  return (
    <button
      type="button"
      className={cn(listRowButtonClassName, className)}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

type ListRowLinkProps = {
  children: React.ReactNode;
  href: string;
  className?: string;
  testId?: string;
};

export function ListRowLink({
  children,
  href,
  className,
  testId,
}: ListRowLinkProps) {
  return (
    <Link
      href={href}
      className={cn(listRowButtonClassName, className)}
      data-testid={testId}
    >
      {children}
    </Link>
  );
}

type ListRowBodyProps = {
  children: React.ReactNode;
  className?: string;
};

export function ListRowBody({ children, className }: ListRowBodyProps) {
  return <div className={cn("min-w-0 flex-1", className)}>{children}</div>;
}

type ListRowTitleProps = {
  children: React.ReactNode;
  className?: string;
};

export function ListRowTitle({ children, className }: ListRowTitleProps) {
  return (
    <p className={cn("truncate text-sm font-medium", className)}>{children}</p>
  );
}

type ListRowMetaProps = {
  children: React.ReactNode;
  className?: string;
};

export function ListRowMeta({ children, className }: ListRowMetaProps) {
  return (
    <p className={cn("truncate text-xs text-muted-foreground", className)}>
      {children}
    </p>
  );
}

type ListRowTrailingProps = {
  children: React.ReactNode;
  className?: string;
};

export function ListRowTrailing({ children, className }: ListRowTrailingProps) {
  return (
    <span
      className={cn("shrink-0 text-sm font-semibold tabular-nums", className)}
    >
      {children}
    </span>
  );
}
