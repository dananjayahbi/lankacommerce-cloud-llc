"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple tooltip using native title attribute fallback + CSS tooltip
interface TooltipProviderProps { children: React.ReactNode; delayDuration?: number | undefined }
interface TooltipProps { children: React.ReactNode; open?: boolean | undefined; onOpenChange?: ((open: boolean) => void) | undefined }
interface TooltipTriggerProps extends React.HTMLAttributes<HTMLSpanElement> { asChild?: boolean | undefined; children: React.ReactNode }
interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> { children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" | undefined; sideOffset?: number | undefined }

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

function Tooltip({ children }: TooltipProps) {
  return <span className="group relative inline-block">{children}</span>
}

function TooltipTrigger({ children, className, asChild: _asChild, ...props }: TooltipTriggerProps) {
  return (
    <span className={cn("cursor-default", className)} {...props}>
      {children}
    </span>
  )
}

function TooltipContent({ children, className, side: _side, sideOffset: _sideOffset, ...props }: TooltipContentProps) {
  return (
    <div
      data-slot="tooltip-content"
      className={cn(
        "absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 max-w-xs rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
