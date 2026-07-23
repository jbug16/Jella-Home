"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconButtonProps = Omit<React.ComponentProps<"button">, "children"> &
  VariantProps<typeof buttonVariants> & {
    /** Accessible name. Required — icons alone are not enough. */
    label: string;
    /** Desktop hover hint. Defaults to `label`. */
    tooltip?: string;
    asChild?: boolean;
    children: React.ReactNode;
  };

/**
 * Compact icon control with a required accessible label and ≥44px touch target.
 * Use for secondary actions (edit, delete, prev/next). Keep primary CTAs labeled.
 */
function IconButton({
  className,
  variant = "ghost",
  size = "icon",
  label,
  tooltip,
  asChild = false,
  children,
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const title = tooltip ?? label;

  return (
    <Comp
      data-slot="icon-button"
      aria-label={label}
      title={title}
      className={cn(
        buttonVariants({ variant, size }),
        "size-11 shrink-0",
        className,
      )}
      {...(!asChild ? { type: "button" as const } : {})}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { IconButton };
