"use client"

import { toast } from "sonner"

interface ToastOptions {
  title?: string | undefined
  description?: string | undefined
  variant?: "default" | "destructive" | undefined
  duration?: number | undefined
}

function useToast() {
  const showToast = ({ title, description, variant }: ToastOptions) => {
    const message = title ?? description ?? ""
    const detail = title && description ? description : undefined
    if (variant === "destructive") {
      toast.error(message, detail ? { description: detail } : undefined)
    } else {
      toast.success(message, detail ? { description: detail } : undefined)
    }
  }
  return { toast: showToast }
}

export { useToast }
export type { ToastOptions }
