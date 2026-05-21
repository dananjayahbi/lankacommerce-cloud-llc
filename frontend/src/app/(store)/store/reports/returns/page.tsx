'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { RefreshCwIcon, CheckCircleIcon, AlertTriangleIcon, AlertCircleIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const PIE_COLORS = ['#F97316', '#1B2B3A', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

interface CategoryRow {
  categoryId: string
  categoryName: string
  returnAmount: string
  returnedUnits: number
  categoryRevenue: string
  returnRate: number
}

interface ReasonRow {
  reason: string
  count: number
  total: string
}

interface TopProduct {
  productId: string
  productName: string
  returnedUnits: number
  returnedAmount: string
}

interface ReturnData {
  overall: {
    totalRevenue: string
    totalRefunds: string
    returnCount: number
    returnRate: number
  }
  byCategory: CategoryRow[]
  byReason: ReasonRow[]
  topReturnedProducts: TopProduct[]
}

function fmtMoney(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

function RateCell({ rate }: { rate: number }) {
  const color =
    rate < 3 ? 'text-green-600' : rate < 7 ? 'text-amber-500' : 'text-red-500 font-bold'
  return <span className={cn('tabular-nums font-mono', color)}>{rate.toFixed(2)}%</span>
}

function ReturnRateBadge({ rate }: { rate: number }) {
  if (rate < 3) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircleIcon className="size-6" />
        <span>
          <span className="text-3xl font-bold">{rate.toFixed(2)}%</span>
          <span className="ml-2 text-sm font-medium">Healthy</span>
        </span>
      </div>
    )
  }
  if (rate < 7) {
    return (
      <div className="flex items-center gap-2 text-amber-500">
        <AlertTriangleIcon className="size-6" />
        <span>
          <span className="text-3xl font-bold">{rate.toFixed(2)}%</span>
          <span className="ml-2 text-sm font-medium">Elevated</span>
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-red-500">
      <AlertCircleIcon className="size-6" />
      <span>
        <span className="text-3xl font-bold">{rate.toFixed(2)}%</span>
        <span className="ml-2 text-sm font-medium">Critical</span>
      </span>
    </div>
  )
}

export default function ReturnRatePage() {
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString()
  const defaultTo = new Date().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  const { data, isLoading, isError, error, refetch } = useQuery<ReturnData>({
    queryKey: ['return-rate', fromParam, toParam],
    queryFn: async () => {
      const params = new URLSearchParams({ from_date: fromParam, to_date: toParam })
      const url = `${API_BASE}/api/reports/returns/?${params.toString()}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as ReturnData
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (data) setReportData(data as unknown as Record<string, unknown>)
  }, [data, setReportData])

  const maxReturnedUnits = Math.max(...(data?.topReturnedProducts ?? []).map((p) => p.returnedUnits), 1)

  if (isLoading && !data) {
    return (
      <ReportLayout title="Return Rate">
        <Skeleton className="h-24 rounded-lg" />
        <div className="mt-6 grid grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="mt-6 h-64 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Return Rate">
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

  if (!data || data.overall.returnCount === 0) {
    return (
      <ReportLayout title="Return Rate">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No return data for this period</p>
          <p className="text-sm text-text-muted">
            Return rate is 0% — no returns recorded in the selected range.
          </p>
        </div>
      </ReportLayout>
    )
  }

  const pieData = data.byReason.map((r) => ({ name: r.reason, value: r.count }))

  return (
    <ReportLayout title="Return Rate">
      {/* Overall Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Revenue</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            Rs. {fmtMoney(data.overall.totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Refunds</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            Rs. {fmtMoney(data.overall.totalRefunds)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Return Count</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            {data.overall.returnCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="mb-1 text-xs text-text-muted">Return Rate</p>
          <ReturnRateBadge rate={data.overall.returnRate} />
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-navy">Return Rate by Category</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  {['Category', 'Revenue', 'Returned', 'Units', 'Rate'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.byCategory]
                  .sort((a, b) => b.returnRate - a.returnRate)
                  .map((row, idx) => (
                    <tr
                      key={row.categoryId || idx}
                      className={cn(
                        'border-b border-border last:border-0',
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-navy">{row.categoryName}</td>
                      <td className="px-3 py-2 font-mono text-right tabular-nums text-text-muted text-xs">
                        {fmtMoney(row.categoryRevenue)}
                      </td>
                      <td className="px-3 py-2 font-mono text-right tabular-nums text-navy text-xs">
                        {fmtMoney(row.returnAmount)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-navy">{row.returnedUnits}</td>
                      <td className="px-3 py-2">
                        <RateCell rate={row.returnRate} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reasons Donut Chart */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-navy">Returns by Reason</h2>
          <div className="rounded-lg border border-border bg-white p-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const row = data.byReason.find((r) => r.reason === name)
                    return [`${value} returns — Rs. ${fmtMoney(row?.total ?? 0)}`, name]
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Top 10 Most-Returned Products */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy">Top 10 Most-Returned Products</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {['Rank', 'Product Name', 'Returned Units', 'Returned Amount'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topReturnedProducts.map((p, idx) => {
                const opacity = Math.max(0.2, p.returnedUnits / maxReturnedUnits)
                return (
                  <tr
                    key={p.productId}
                    style={{ borderLeft: `3px solid rgba(239,68,68,${opacity})` }}
                    className={cn(
                      'border-b border-border last:border-0',
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                    )}
                  >
                    <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-navy">{p.productName}</td>
                    <td className="px-3 py-2 tabular-nums text-navy">{p.returnedUnits}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-navy">
                      Rs. {fmtMoney(p.returnedAmount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </ReportLayout>
  )
}
