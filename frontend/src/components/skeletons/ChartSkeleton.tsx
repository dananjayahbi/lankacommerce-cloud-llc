import { BaseSkeleton } from './BaseSkeleton'

interface ChartSkeletonProps {
  barCount?: number
}

export function ChartSkeleton({ barCount = 7 }: ChartSkeletonProps) {
  const heights = [40, 65, 55, 80, 45, 70, 50, 90, 60, 75, 35, 85]

  return (
    <div
      role="presentation"
      aria-hidden="true"
      aria-label="Loading chart"
      className="rounded-xl border border-[#E2E8F0] bg-white p-5"
    >
      {/* Chart title placeholder */}
      <div className="mb-4 flex items-center justify-between">
        <BaseSkeleton className="h-4 w-32 rounded" />
        <BaseSkeleton className="h-7 w-24 rounded-lg" />
      </div>

      {/* Bars */}
      <div className="flex h-[320px] items-end gap-2.5">
        {Array.from({ length: barCount }).map((_, i) => {
          const pct = heights[i % heights.length]
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <BaseSkeleton
                className="w-full rounded-t-md"
                style={{ height: `${pct}%` }}
              />
              <BaseSkeleton className="h-2.5 w-8 rounded" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
