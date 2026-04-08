// Base primitive
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`}
    />
  );
}

// Card skeleton — Dashboard widget / runs list
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-40" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-2 flex-1 rounded-full" />
        <Skeleton className="h-2 flex-1 rounded-full" />
        <Skeleton className="h-2 flex-1 rounded-full" />
      </div>
    </div>
  );
}

// List row skeleton — Test Cases / Shared Steps list
export function ListRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <Skeleton className="h-4 w-4 rounded-sm" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 flex-1 max-w-xs" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
  );
}

// Full list skeleton — wraps multiple ListRowSkeleton
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Detail panel skeleton — TC Detail sidebar
export function DetailPanelSkeleton() {
  return (
    <div role="status" aria-label="Loading details" className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
