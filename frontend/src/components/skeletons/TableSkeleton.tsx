import { BaseSkeleton } from './BaseSkeleton'

interface TableSkeletonProps {
  columns?: number
  rows?: number
}

export function TableSkeleton({ columns = 5, rows = 8 }: TableSkeletonProps) {
  return (
    <div role="presentation" aria-hidden="true" aria-label="Loading table" className="overflow-hidden rounded-xl border border-[#E2E8F0]">
      {/* Header row */}
      <div className="flex gap-4 border-b border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <BaseSkeleton key={i} className="h-3 flex-1 rounded" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 border-b border-[#E2E8F0] px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <BaseSkeleton
              key={colIdx}
              className={`h-3 flex-1 rounded ${colIdx === 0 ? 'max-w-[140px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
