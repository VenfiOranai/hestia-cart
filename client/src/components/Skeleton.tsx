interface Props {
  className?: string;
}

export function Skeleton({ className = "" }: Props) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export function ListPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function JoinPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function MyListsSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i}>
          <Skeleton className="h-16 w-full rounded-lg" />
        </li>
      ))}
    </ul>
  );
}
