import { cn } from "@/lib/utils";

type PanelListProps = {
  children: React.ReactNode;
  className?: string;
  testId?: string;
  "aria-labelledby"?: string;
};

/** Bordered, divided list container used across budget, subscriptions, recipes, etc. */
export function PanelList({
  children,
  className,
  testId,
  ...rest
}: PanelListProps) {
  return (
    <ul
      className={cn("divide-y rounded-lg border", className)}
      data-testid={testId}
      {...rest}
    >
      {children}
    </ul>
  );
}

type PanelListItemProps = {
  children: React.ReactNode;
  className?: string;
  testId?: string;
};

export function PanelListItem({
  children,
  className,
  testId,
}: PanelListItemProps) {
  return (
    <li
      className={cn("sm:flex sm:items-center", className)}
      data-testid={testId}
    >
      {children}
    </li>
  );
}
