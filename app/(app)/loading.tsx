import { Skeleton } from "@/components/ui/skeleton";

/** Shared loading boundary for every route in the app group. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
