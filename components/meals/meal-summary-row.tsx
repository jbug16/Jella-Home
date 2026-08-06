import { StickyNote } from "lucide-react";
import Link from "next/link";

type MealSummaryRowBaseProps = {
  title: string;
  meta: string;
  imageUrl: string | null;
  ariaLabel?: string;
  testId?: string;
  notes?: string;
  showNotesIndicator?: boolean;
};

type MealSummaryRowProps = MealSummaryRowBaseProps &
  ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

const rowClassName =
  "flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-14 sm:gap-3 sm:p-1.5 sm:pr-3";

/** Shared image-first meal row used by Dashboard and narrow meal-day lists. */
export function MealSummaryRow({
  title,
  meta,
  imageUrl,
  ariaLabel,
  testId,
  notes,
  showNotesIndicator = false,
  href,
  onClick,
}: MealSummaryRowProps) {
  const content = (
    <>
      <MealSummaryThumbnail title={title} imageUrl={imageUrl} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm leading-snug font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span>{meta}</span>
          {showNotesIndicator && notes ? (
            <span className="inline-flex" title="Has notes">
              <StickyNote className="size-3 opacity-70" aria-hidden />
              <span className="sr-only">Has notes</span>
            </span>
          ) : null}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={rowClassName}
        aria-label={ariaLabel}
        data-testid={testId}
        data-slot="meal-summary-row"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={rowClassName}
      aria-label={ariaLabel}
      data-testid={testId}
      data-slot="meal-summary-row"
      data-meal-notes={notes}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function MealSummaryThumbnail({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    return (
      <span
        className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60 sm:size-14 sm:rounded-lg"
        aria-hidden
        data-slot="meal-summary-thumbnail"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          data-testid="meal-summary-image"
        />
      </span>
    );
  }

  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tracking-wide text-muted-foreground ring-1 ring-border/60 sm:size-14 sm:rounded-lg"
      aria-hidden
      data-slot="meal-summary-thumbnail"
      title={`${title} has no photo`}
    >
      {title.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
