import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

/** Skeleton genérico de página (header + blocos), usado nos loading.tsx. */
export function PageSkeleton({ linhas = 4 }: { linhas?: number }) {
  return (
    <main className="min-h-screen">
      <div className="container flex items-center justify-between py-6">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="container space-y-3 py-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        {Array.from({ length: linhas }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </main>
  );
}
