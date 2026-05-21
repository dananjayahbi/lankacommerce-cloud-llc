import * as React from "react"
import { cn } from "@/lib/utils"

function Breadcrumb({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav aria-label="breadcrumb" className={cn(className)} {...props} />
}

function BreadcrumbList({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) {
  return <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm text-slate-500", className)} {...props} />
}

function BreadcrumbItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />
}

function BreadcrumbLink({ className, href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} className={cn("hover:text-slate-900 transition-colors", className)} {...props}>
      {children}
    </a>
  )
}

function BreadcrumbPage({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span aria-current="page" className={cn("font-medium text-slate-900", className)} {...props} />
}

function BreadcrumbSeparator({ className, children, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li role="presentation" aria-hidden="true" className={cn("text-slate-400", className)} {...props}>
      {children ?? "/"}
    </li>
  )
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator }
