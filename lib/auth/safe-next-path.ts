/**
 * Validate a post-sign-in redirect target.
 * Only same-origin relative paths are allowed (rejects protocol-relative URLs).
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof raw !== "string") {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  if (trimmed.includes("\\") || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return fallback;
  }

  try {
    const base = "http://jella.local";
    const resolved = new URL(trimmed, base);
    if (resolved.origin !== base) {
      return fallback;
    }
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) {
      return fallback;
    }
    return path;
  } catch {
    return fallback;
  }
}
