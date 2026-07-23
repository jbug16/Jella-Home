/**
 * Compact brand header for phones and iPad portrait only.
 * Desktop / iPad landscape use the sidebar brand — no top bar.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)] supports-[backdrop-filter]:bg-background/80 sidebar:hidden">
      <div className="flex h-12 items-center px-4">
        <span className="text-base font-semibold tracking-tight">
          Jella Home
        </span>
      </div>
    </header>
  );
}
