import { SignOutButton } from "@/components/auth/sign-out-button";

/**
 * Compact top header. Primarily for phones and iPad portrait, where the
 * sidebar is hidden; it stays visible on larger screens as a thin app bar.
 */
export function AppHeader({ displayName }: { displayName: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)] supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between gap-2 px-4 sidebar:px-6">
        <span className="text-base font-semibold sidebar:hidden">
          Jella Home
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {displayName}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
