import { redirect } from "next/navigation";

import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentMembership } from "@/lib/repositories/households";

// Membership checks require request cookies + Supabase env; never prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/not-provisioned");
  }

  return (
    <div className="flex min-h-[100dvh] min-w-0 max-w-full sidebar:h-[100dvh] sidebar:overflow-hidden">
      <SessionKeepAlive />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <AppSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] sidebar:px-8 sidebar:py-6 sidebar:pb-8"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-col sidebar:h-full">
            {children}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
