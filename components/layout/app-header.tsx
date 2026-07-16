/**
 * Compact top header. Primarily for phones and iPad portrait, where the
 * sidebar is hidden; it stays visible on larger screens as a thin app bar.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)] supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-2 px-4 sidebar:px-6">
        <span className="text-base font-semibold sidebar:hidden">
          Jella Home
        </span>
      </div>
    </header>
  );
}
