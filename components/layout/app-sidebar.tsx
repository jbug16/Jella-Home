"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { isActivePath, navItems } from "@/components/layout/nav-items";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Persistent sidebar shown on desktop and iPad landscape (>= 1120px).
 * Hidden below that width, where the mobile navigation takes over.
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden sidebar:flex sidebar:w-64 sidebar:shrink-0 sidebar:flex-col sidebar:border-r sidebar:border-sidebar-border sidebar:bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-6">
        <span className="text-lg font-semibold text-sidebar-foreground">
          Jella Home
        </span>
      </div>
      <ScrollArea className="flex-1 px-3 pb-4">
        <nav aria-label="Primary" className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon
                  className="size-5 shrink-0"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
