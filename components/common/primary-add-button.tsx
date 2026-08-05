import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PrimaryAddButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "size" | "children"
> & {
  /** Accessible name — icon-only button uses this as aria-label. */
  label: string;
  /** When true, stretches to fill a tall parent (e.g. summary stat row). */
  stretch?: boolean;
};

/** Icon-only add control for panel toolbars. */
export function PrimaryAddButton({
  label,
  stretch = false,
  className,
  ...props
}: PrimaryAddButtonProps) {
  return (
    <Button
      type="button"
      size="touch"
      aria-label={label}
      className={cn(
        "shrink-0 px-0",
        stretch ? "h-auto min-h-11 w-11 self-stretch" : "size-11",
        className,
      )}
      {...props}
    >
      <Plus className="size-4" aria-hidden />
    </Button>
  );
}
