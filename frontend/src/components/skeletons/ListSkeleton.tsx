import { BaseSkeleton } from './BaseSkeleton'

interface ListSkeletonProps {
  items?: number
}

export function ListSkeleton({ items = 6 }: ListSkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      aria-label="Loading list"
      className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white"
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <BaseSkeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <BaseSkeleton className="h-3 w-1/3 rounded" />
            <BaseSkeleton className="h-2.5 w-1/2 rounded" />
          </div>
          <BaseSkeleton className="h-5 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}
