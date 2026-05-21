"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | undefined
  max?: number | undefined
}

function Progress({ className, value, max = 100, ...props }: ProgressProps) {
  const percentage = value != null ? Math.min(Math.max((value / max) * 100, 0), 100) : 0
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[#F97316] transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export { Progress }
