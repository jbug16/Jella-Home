/**
 * Normalize version tokens for optimistic concurrency round-trips.
 * Keeps full DB precision (do not convert via `toISOString()`, which drops
 * microseconds and breaks `updated_at` equality checks).
 * Repairs `+` in offsets that some form encodings turn into spaces.
 */
export function toVersionTimestamp(value: string): string {
  const trimmed = value.trim();
  // e.g. "2026-07-23T19:00:00.123456 00:00" → "...+00:00"
  if (/T\d{2}:\d{2}:\d{2}(?:\.\d+)? \d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(
      /(T\d{2}:\d{2}:\d{2}(?:\.\d+)?) (\d{2}:\d{2})$/,
      "$1+$2",
    );
  }
  // e.g. "2026-07-23T19:00:00.123456 +00:00" → "...+00:00"
  if (/T\d{2}:\d{2}:\d{2}(?:\.\d+)? [+-]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(
      /(T\d{2}:\d{2}:\d{2}(?:\.\d+)?) ([+-]\d{2}:\d{2})$/,
      "$1$2",
    );
  }
  return trimmed;
}
