"use client";

import { usePathname } from "next/navigation";

import { isActivePath, navItems } from "@/components/layout/nav-items";

function pageTitle(pathname: string): string {
  const match = navItems.find((item) => isActivePath(pathname, item.href));
  if (match) {
    return match.label;
  }
  if (pathname.startsWith("/recipes/")) {
    return "Recipe";
  }
  return "Jella's Home";
}

/**
 * Compact header for phones and iPad portrait.
 * Shows the current page title so every route has visible context.
 */
export function AppHeader() {
  const pathname = usePathname();
  const title = pageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)] supports-[backdrop-filter]:bg-background/80 sidebar:hidden">
      <div className="flex h-12 items-center px-4">
        <h1 className="truncate text-base font-semibold tracking-tight">
          {title}
        </h1>
      </div>
    </header>
  );
}
