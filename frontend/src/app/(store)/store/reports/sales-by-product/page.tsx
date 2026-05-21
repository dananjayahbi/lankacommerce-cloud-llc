'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { subDays, startOfToday, endOfToday } from 'date-fns'
import { RefreshCwIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

interface ProductRow {
  productVariantId: string
  productName: string
  variantName: string
  sku: string
  unitsSold: number
  grossRevenue: string
  returns: string
  returnedUnits: number
  netRevenue: string
  pctOfTotal: number
}

type SortKey = keyof ProductRow
type SortDir = 'asc' | 'desc'

function fmt(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUpIcon className="size-3 opacity-30" />
  return sortDir === 'asc' ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />
}

export default function SalesByProductPage() {
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const [sortKey, setSortKey] = useState<SortKey>('netRevenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const defaultFrom = subDays(startOfToday(), 29).toISOString()
  const defaultTo = endOfToday().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  const { data, isLoading, isError, error, refetch } = useQuery<{
    rows: ProductRow[]
    totalRevenue: string
  }>({
    queryKey: ['sales-by-product', fromParam, toParam],
    queryFn: async () => {
      const url = `${API_BASE}/api/reports/sales-by-product/?from_date=${encodeURIComponent(fromParam)}&to_date=${encodeURIComponent(toParam)}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (data) setReportData(data as Record<string, unknown>)
  }, [data, setReportData])

  const sortedRows = data?.rows
    ? [...data.rows].sort((a, b) => {
        const av = typeof a[sortKey] === 'string' ? Number(a[sortKey]) : (a[sortKey] as number)
        const bv = typeof b[sortKey] === 'string' ? Number(b[sortKey]) : (b[sortKey] as number)
        return sortDir === 'asc' ? av - bv : bv - av
      })
    : []

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const chartData = [...(data?.rows ?? [])]
    .sort((a, b) => Number(b.netRevenue) - Number(a.netRevenue))
    .slice(0, 10)
    .map((r) => ({
      name: r.productName.length > 25 ? r.productName.slice(0, 25) + '…' : r.productName,
      netRevenue: Number(r.netRevenue),
    }))

  if (isLoading && !data) {
    return (
      <ReportLayout title="Sales by Product">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="mt-4 h-48 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Sales by Product">
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

  if (!data || data.rows.length === 0) {
    return (
      <ReportLayout title="Sales by Product">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No data for this period</p>
          <p className="text-sm text-text-muted">No sales data for this period. Try a different date range.</p>
        </div>
      </ReportLayout>
    )
  }

  const cols: { key: SortKey; label: string; right?: boolean }[] = [
    { key: 'productName', label: 'Product' },
    { key: 'variantName', label: 'Variant' },
    { key: 'sku', label: 'SKU' },
    { key: 'unitsSold', label: 'Units Sold', right: true },
    { key: 'grossRevenue', label: 'Gross Revenue', right: true },
    { key: 'returns', label: 'Returns', right: true },
    { key: 'netRevenue', label: 'Net Revenue', right: true },
    { key: 'pctOfTotal', label: '% of Total', right: true },
  ]

  return (
    <ReportLayout title="Sales by Product">
      {/* Top-10 Chart */}
      {chartData.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Top 10 Products by Net Revenue</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                tickFormatter={(v) => `Rs. ${new Intl.NumberFormat('en-LK', { notation: 'compact' }).format(v)}`}
                tick={{ fontSize: 12 }}
              />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v) => [`Rs. ${fmt(String(v))}`, 'Net Revenue']} />
              <Bar dataKey="netRevenue" fill="#F97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sortable Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {cols.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={cn(
                      'cursor-pointer select-none px-4 py-2 font-semibold text-navy',
                      col.right ? 'text-right' : 'text-left',
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={row.productVariantId}
                  className="border-b border-border hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 py-2 text-navy">{row.productName}</td>
                  <td className="px-4 py-2 text-text-muted">{row.variantName}</td>
                  <td className="px-4 py-2 font-mono text-text-muted">{row.sku}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-navy">{row.unitsSold}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-navy">Rs. {fmt(row.grossRevenue)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-red-500">Rs. {fmt(row.returns)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-navy font-semibold">Rs. {fmt(row.netRevenue)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-2 rounded-full bg-orange"
                          style={{ width: `${Math.min(row.pctOfTotal, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-navy">{row.pctOfTotal.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportLayout>
  )
}
