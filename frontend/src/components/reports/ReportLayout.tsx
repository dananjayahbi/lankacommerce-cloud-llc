import type { ReactNode } from 'react'

interface ReportLayoutProps {
  title: string
  children: ReactNode
  actions?: ReactNode
}

export function ReportLayout({ title, children, actions }: ReportLayoutProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="border-t border-border" />
      <div>{children}</div>
    </div>
  )
}
