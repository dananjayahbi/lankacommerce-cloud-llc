"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AlertDialogProps { children: React.ReactNode; open?: boolean | undefined; onOpenChange?: ((open: boolean) => void) | undefined }
interface AlertDialogTriggerProps extends React.HTMLAttributes<HTMLSpanElement> { children: React.ReactNode; asChild?: boolean | undefined }
interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> { children: React.ReactNode }
interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
interface AlertDialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface AlertDialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function AlertDialog({ children, open, onOpenChange }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open ?? internalOpen
  const setIsOpen = onOpenChange ?? setInternalOpen
  return (
    <AlertDialogContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

const AlertDialogContext = React.createContext<{ isOpen: boolean; setIsOpen: (v: boolean) => void }>({ isOpen: false, setIsOpen: () => {} })

function AlertDialogTrigger({ children, asChild: _asChild, className, onClick, ...props }: AlertDialogTriggerProps) {
  const { setIsOpen } = React.useContext(AlertDialogContext)
  return (
    <span
      className={cn("cursor-pointer", className)}
      onClick={(e) => { setIsOpen(true); onClick?.(e); }}
      {...props}
    >
      {children}
    </span>
  )
}

function AlertDialogContent({ children, className, ...props }: AlertDialogContentProps) {
  const { isOpen } = React.useContext(AlertDialogContext)
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div
        data-slot="alert-dialog-content"
        className={cn("relative z-50 max-w-md w-full rounded-xl bg-white p-6 shadow-xl", className)}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />
}

function AlertDialogAction({ className, onClick, ...props }: AlertDialogActionProps) {
  const { setIsOpen } = React.useContext(AlertDialogContext)
  return (
    <Button
      className={cn(className)}
      onClick={(e) => { setIsOpen(false); onClick?.(e); }}
      {...props}
    />
  )
}

function AlertDialogCancel({ className, onClick, ...props }: AlertDialogCancelProps) {
  const { setIsOpen } = React.useContext(AlertDialogContext)
  return (
    <Button
      variant="outline"
      className={cn("mt-2 sm:mt-0", className)}
      onClick={(e) => { setIsOpen(false); onClick?.(e); }}
      {...props}
    />
  )
}

export {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel
}
