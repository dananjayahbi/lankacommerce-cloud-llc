import { BaseSkeleton } from './BaseSkeleton'

interface CardGridSkeletonProps {
  count?: number
}

export function CardGridSkeleton({ count = 3 }: CardGridSkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      aria-label="Loading cards"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            <BaseSkeleton className="size-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <BaseSkeleton className="h-3 w-2/3 rounded" />
              <BaseSkeleton className="h-2.5 w-1/3 rounded" />
            </div>
          </div>
          <BaseSkeleton className="h-6 w-1/2 rounded" />
          <BaseSkeleton className="h-2.5 w-full rounded" />
        </div>
      ))}
    </div>
  )
}
