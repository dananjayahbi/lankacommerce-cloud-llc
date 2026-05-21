'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { subDays, startOfToday, endOfToday, format } from 'date-fns'
import { DownloadIcon, BookmarkIcon, ChevronDownIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { ReportContextProvider, useReportContext } from '@/lib/reports/ReportContext'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { ReportColumn, ReportRow } from '@/lib/reports/types'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const NAV_LINKS = [
  { label: 'Profit & Loss', href: '/reports/profit-loss' },
  { label: 'Sales by Product', href: '/reports/sales-by-product' },
  { label: 'Sales by Staff', href: '/reports/sales-by-staff' },
  { label: 'Revenue Trend', href: '/reports/revenue-trend' },
  { label: 'Inventory Valuation', href: '/reports/inventory-valuation' },
  { label: 'Stock Movements', href: '/reports/stock-movements' },
  { label: 'Customer Analytics', href: '/reports/customers' },
  { label: 'Staff Performance', href: '/reports/staff-performance' },
  { label: 'Returns', href: '/reports/returns' },
]

// ─── Export helpers ───────────────────────────────────────────────────────────

function deriveExportArgs(
  data: Record<string, unknown>,
  pathname: string,
): { rows: ReportRow[]; columns: ReportColumn[]; filename: string; title: string } | null {
  const keys = Object.keys(data)
  const ARRAY_KEYS = ['items', 'rows', 'products', 'categories', 'staff', 'customers', 'movements', 'lines', 'topReturnedProducts', 'byCategory', 'byProduct', 'byStaff']
  const arrayKey =
    ARRAY_KEYS.find((k) => Array.isArray(data[k])) ?? keys.find((k) => Array.isArray(data[k]))

  let rows: ReportRow[] = []
  if (arrayKey && Array.isArray(data[arrayKey])) {
    rows = data[arrayKey] as ReportRow[]
  } else {
    rows = [data as ReportRow]
  }
  if (rows.length === 0) return null

  const firstRow = rows[0]
  const columns: ReportColumn[] = Object.keys(firstRow).map((key) => {
    const lk = key.toLowerCase()
    let fmt: ReportColumn['format'] = 'text'
    if (/amount|revenue|total|cost|profit|float|refund|spend/.test(lk)) fmt = 'currency'
    else if (/count|units|qty|quantity|transactions/.test(lk)) fmt = 'number'
    else if (/rate|margin|percent/.test(lk)) fmt = 'percentage'
    else if (/date|_at$|time/.test(lk)) fmt = 'date'
    return {
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
      format: fmt,
      align: ['currency', 'number', 'percentage'].includes(fmt) ? 'right' : 'left',
      width: 15,
    }
  })

  const reportName = pathname.split('/').filter(Boolean).pop() ?? 'report'
  const today = format(new Date(), 'MMM-yyyy')
  return {
    rows,
    columns,
    filename: `${reportName}_${today}`,
    title: reportName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }
}

// ─── Export Dropdown ──────────────────────────────────────────────────────────

function ExportDropdown() {
  const { reportData } = useReportContext()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleExport(type: 'pdf' | 'csv' | 'excel') {
    if (!reportData) {
      toast.error('No report data available to export.')
      return
    }
    const args = deriveExportArgs(reportData, pathname)
    if (!args) {
      toast.error('No exportable data in this report.')
      return
    }
    setOpen(false)
    setExporting(true)
    try {
      if (type === 'csv') {
        const { exportToCSV } = await import('@/lib/reports/export')
        exportToCSV(args.rows, args.columns, args.filename)
      } else if (type === 'excel') {
        const { exportToExcel } = await import('@/lib/reports/export')
        exportToExcel(args.rows, args.columns, args.filename)
      } else {
        const { exportToPDF } = await import('@/lib/reports/export')
        await exportToPDF(args.rows, args.columns, args.filename, args.title, pathname)
        toast.success('PDF exported successfully.')
      }
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={exporting}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-navy hover:bg-gray-50 disabled:opacity-60"
      >
        <DownloadIcon className="size-4 text-text-muted" />
        {exporting ? 'Exporting…' : 'Export'}
        <ChevronDownIcon className="size-4 text-text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-white shadow-lg">
          {(['PDF', 'CSV', 'Excel'] as const).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleExport(label.toLowerCase() as 'pdf' | 'csv' | 'excel')}
              className="w-full px-4 py-2 text-left text-sm text-navy hover:bg-background first:rounded-t-lg last:rounded-b-lg"
            >
              Export as {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Save Report Dialog ───────────────────────────────────────────────────────

function SaveReportDialog({
  from,
  to,
}: {
  from: string
  to: string
}) {
  const pathname = usePathname()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const reportType = pathname.split('/').filter(Boolean).pop() ?? 'unknown'

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Please enter a report name.')
      return
    }
    if (name.length > 100) {
      toast.error('Report name must be 100 characters or less.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/reports/saved/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), report_type: reportType, filters: { from, to } }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.error ?? 'Failed to save report.')
      } else {
        toast.success('Report saved successfully.')
        setOpen(false)
        setName('')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange/90"
      >
        <BookmarkIcon className="size-4" />
        Save Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-navy">Save Report</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="My Report"
              className="mb-4 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/30"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setName('')
                }}
                className="rounded-lg border border-border px-4 py-1.5 text-sm text-navy hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="rounded-lg bg-orange px-4 py-1.5 text-sm font-medium text-white hover:bg-orange/90 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Inner Layout (needs hooks) ───────────────────────────────────────────────

function ReportsLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultFrom = format(subDays(startOfToday(), 29), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
  const defaultTo = format(endOfToday(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")

  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  function handleRangeChange(range: { from: Date; to: Date }) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', range.from.toISOString())
    params.set('to', range.to.toISOString())
    router.replace(pathname + '?' + params.toString())
  }

  const pickerValue =
    searchParams.get('from') && searchParams.get('to')
      ? {
          from: new Date(fromParam),
          to: new Date(toParam),
        }
      : undefined

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-white lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <h2 className="text-base font-semibold text-navy">Reports</h2>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 pb-6">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-l-4 border-l-[#F97316] bg-[#FFF7ED] font-medium text-navy pl-2'
                    : 'text-text-muted hover:bg-background hover:text-navy',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
          <DateRangePicker value={pickerValue} onRangeChange={handleRangeChange} />
          <div className="flex items-center gap-2">
            <ExportDropdown />
            <SaveReportDialog from={fromParam} to={toParam} />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

// ─── Default Export ───────────────────────────────────────────────────────────

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <ReportContextProvider>
      <ReportsLayoutInner>{children}</ReportsLayoutInner>
    </ReportContextProvider>
  )
}
