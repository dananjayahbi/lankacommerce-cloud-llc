import React from 'react'
import { cn } from '@/lib/utils'

interface BaseSkeletonProps {
  className?: string | undefined
  width?: string | undefined
  height?: string | undefined
  style?: React.CSSProperties | undefined
}

export function BaseSkeleton({ className, width, height, style }: BaseSkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      style={{ width, height, ...style }}
      className={cn(
        'animate-pulse rounded-md bg-[#E2E8F0] bg-opacity-40',
        className,
      )}
    />
  )
}
