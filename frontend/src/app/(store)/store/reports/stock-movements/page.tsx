'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { RefreshCwIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const REASON_LABELS: Record<string, string> = {
  SALE: 'Sale',
  VOID_REVERSAL: 'Void Reversal',
  SALE_RETURN: 'Sale Return',
  PURCHASE_RECEIPT: 'Purchase Receipt',
  MANUAL_ADJUSTMENT: 'Manual Adjustment',
  STOCK_TAKE_ADJUSTMENT: 'Stock Take Adj.',
  DAMAGE_WRITE_OFF: 'Damage Write-Off',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  INITIAL_STOCK: 'Initial Stock',
}

const REASON_COLORS: Record<string, string> = {
  SALE: 'bg-navy text-white',
  VOID_REVERSAL: 'border border-border text-navy bg-white',
  SALE_RETURN: 'border border-border text-navy bg-white',
  PURCHASE_RECEIPT: 'bg-green-500 text-white',
  MANUAL_ADJUSTMENT: 'bg-blue-500 text-white',
  STOCK_TAKE_ADJUSTMENT: 'bg-amber-500 text-white',
  DAMAGE_WRITE_OFF: 'bg-red-500 text-white',
  TRANSFER_IN: 'bg-purple-500 text-white',
  TRANSFER_OUT: 'bg-pink-500 text-white',
  INITIAL_STOCK: 'bg-teal-500 text-white',
}

interface MovementRow {
  id: string
  createdAt: string
  productName: string
  variantName: string
  sku: string
  reason: string
  quantityDelta: number
  quantityBefore: number
  quantityAfter: number
  actorName: string
  note: string
  reference: string | null
}

interface SummaryItem {
  reason: string
  totalDelta: number
  count: number
}

interface StockMovementData {
  summary: SummaryItem[]
  results: MovementRow[]
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalCount: number
  }
}

function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        REASON_COLORS[reason] ?? 'bg-gray-100 text-gray-800',
      )}
    >
      {REASON_LABELS[reason] ?? reason}
    </span>
  )
}

export default function StockMovementsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString()
  const defaultTo = new Date().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  const reasonParam = searchParams.get('reason') ?? ''
  const pageParam = Number(searchParams.get('page') ?? '1')

  const [searchInput, setSearchInput] = useState(searchParams.get('variant_search') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.replace(pathname + '?' + params.toString())
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.replace(pathname + '?' + params.toString())
  }

  const { data, isLoading, isError, error, refetch } = useQuery<StockMovementData>({
    queryKey: ['stock-movements', fromParam, toParam, debouncedSearch, reasonParam, pageParam],
    queryFn: async () => {
      const params = new URLSearchParams({
        from_date: fromParam,
        to_date: toParam,
        page: String(pageParam),
      })
      if (debouncedSearch) params.set('variant_search', debouncedSearch)
      if (reasonParam) params.set('reason', reasonParam)
      const url = `${API_BASE}/api/reports/stock-movements/?${params.toString()}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as StockMovementData
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (data) setReportData(data as unknown as Record<string, unknown>)
  }, [data, setReportData])

  const totalIn = data?.summary.reduce((acc, s) => acc + (s.totalDelta > 0 ? s.totalDelta : 0), 0) ?? 0
  const totalOut = data?.summary.reduce((acc, s) => acc + (s.totalDelta < 0 ? Math.abs(s.totalDelta) : 0), 0) ?? 0
  const netMovement = totalIn - totalOut
  const totalMovements = data?.summary.reduce((acc, s) => acc + s.count, 0) ?? 0

  const pg = data?.pagination

  if (isLoading && !data) {
    return (
      <ReportLayout title="Stock Movements">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-4 h-12 rounded-lg" />
        <Skeleton className="mt-4 h-96 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Stock Movements">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Failed to load report.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700"
          >
            <RefreshCwIcon className="size-4" /> Retry
          </button>
        </div>
      </ReportLayout>
    )
  }

  return (
    <ReportLayout title="Stock Movements">
      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Net Movement</p>
          <p
            className={cn(
              'mt-1 font-mono text-xl font-semibold tabular-nums',
              netMovement >= 0 ? 'text-green-600' : 'text-red-500',
            )}
          >
            {netMovement >= 0 ? '+' : ''}{netMovement}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total In</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-green-600">
            +{totalIn}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Out</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-red-500">
            -{totalOut}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Movements</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            {totalMovements.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by product name or SKU…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 rounded-md border border-border px-3 text-sm text-navy placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-navy w-72"
        />
        <select
          value={reasonParam}
          onChange={(e) => setParam('reason', e.target.value)}
          className="h-9 rounded-md border border-border px-3 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy"
        >
          <option value="">All Types</option>
          {Object.entries(REASON_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {!data || data.results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No stock movements found</p>
          <p className="text-sm text-text-muted">Try a different date range or filter.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  {['Date', 'Product', 'Variant', 'Type', 'Delta', 'Before', 'After', 'Actor', 'Ref'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border last:border-0',
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-text-muted">
                      {format(new Date(row.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-3 py-2 text-navy">{row.productName}</td>
                    <td className="px-3 py-2 text-text-muted">{row.variantName}</td>
                    <td className="px-3 py-2">
                      <ReasonBadge reason={row.reason} />
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 font-mono font-bold tabular-nums',
                        row.quantityDelta >= 0 ? 'text-green-600' : 'text-red-500',
                      )}
                    >
                      {row.quantityDelta >= 0 ? '+' : ''}{row.quantityDelta}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-text-muted">
                      {row.quantityBefore}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-navy">
                      {row.quantityAfter}
                    </td>
                    <td className="px-3 py-2 text-text-muted">{row.actorName || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text-muted">
                      {row.reference ? (
                        <span title={row.reference} className="truncate block max-w-[80px]">
                          {row.reference.slice(0, 8)}…
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pg && pg.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-text-muted">
                Page {pg.page} of {pg.totalPages} ({pg.totalCount.toLocaleString()} total movements)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pg.page <= 1}
                  onClick={() => setPage(pg.page - 1)}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-navy disabled:opacity-40"
                >
                  <ChevronLeftIcon className="size-4" /> Previous
                </button>
                <button
                  type="button"
                  disabled={pg.page >= pg.totalPages}
                  onClick={() => setPage(pg.page + 1)}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-navy disabled:opacity-40"
                >
                  Next <ChevronRightIcon className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </ReportLayout>
  )
}
