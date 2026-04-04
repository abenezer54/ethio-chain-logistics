type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <span
      className={`block animate-pulse rounded-md bg-ec-border/80 motion-reduce:animate-none ${className}`}
      aria-hidden
    />
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="min-h-screen bg-ec-surface px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="rounded-2xl border border-ec-border bg-ec-card p-6 shadow-md">
          <Skeleton className="mx-auto mb-4 h-7 w-48" />
          <Skeleton className="mx-auto mb-8 h-4 w-full max-w-xs" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="min-h-screen bg-ec-surface">
      <div className="border-b border-ec-border bg-ec-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-ec-border bg-ec-card p-6 shadow-md">
          <Skeleton className="mb-4 h-6 w-2/3" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-lg" />
            <Skeleton className="h-11 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
