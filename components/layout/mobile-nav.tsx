"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  isActivePath,
  primaryNavItems,
  secondaryNavItems,
} from "@/components/layout/nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Bottom navigation for phones and iPad portrait (< 1120px).
 * Shows the four primary destinations plus a "More" sheet for the rest,
 * because seven items do not fit a 360px-wide bottom bar.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = secondaryNavItems.some((item) =>
    isActivePath(pathname, item.href),
  );

  return (
    <nav
      aria-label="Primary"
      className="sidebar:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {primaryNavItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}

        <li>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              aria-current={moreActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                moreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MoreHorizontal
                className="size-5"
                strokeWidth={moreActive ? 2.5 : 2}
                aria-hidden="true"
              />
              <span>More</span>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="pb-[env(safe-area-inset-bottom)]"
            >
              <SheetHeader>
                <SheetTitle>More</SheetTitle>
              </SheetHeader>
              <ul className="flex flex-col gap-1 px-4 pb-6">
                {secondaryNavItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
                        )}
                      >
                        <Icon
                          className="size-5 shrink-0"
                          strokeWidth={active ? 2.5 : 2}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
