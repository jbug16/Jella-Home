import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard-specific loading skeleton matching the card grid. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Skeleton className="motion-reduce:animate-none h-8 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
        <Skeleton className="motion-reduce:animate-none h-40 w-full min-[700px]:col-span-2" />
        <Skeleton className="motion-reduce:animate-none h-32 w-full" />
        <Skeleton className="motion-reduce:animate-none h-32 w-full" />
        <Skeleton className="motion-reduce:animate-none h-28 w-full" />
        <Skeleton className="motion-reduce:animate-none h-28 w-full" />
      </div>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
