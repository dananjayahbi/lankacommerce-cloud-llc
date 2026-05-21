'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { subDays, startOfToday, endOfToday, format } from 'date-fns'
import { RefreshCwIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Granularity = 'daily' | 'weekly' | 'monthly'

interface TrendBucket {
  bucket: string
  revenue: string
  returns: string
  transactions: number
}

interface PeakHour {
  hour: number
  revenue: string
  transactions: number
}

interface TrendData {
  summary: {
    totalRevenue: string
    totalTransactions: number
    avgOrderValue: string
    returnRate: number
  }
  trendBuckets: TrendBucket[]
  peakHours: PeakHour[]
}

function fmt(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

function fmtBucket(bucket: string, granularity: Granularity) {
  try {
    const d = new Date(bucket)
    if (granularity === 'monthly') return format(d, 'MMM yyyy')
    return format(d, 'MMM dd')
  } catch {
    return bucket
  }
}

function fmtHour(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:00 ${ampm}`
}

export default function RevenueTrendPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const defaultFrom = subDays(startOfToday(), 29).toISOString()
  const defaultTo = endOfToday().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo
  const granularity = (searchParams.get('granularity') ?? 'monthly') as Granularity

  function setGranularity(g: Granularity) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('granularity', g)
    router.replace(pathname + '?' + params.toString())
  }

  const { data, isLoading, isError, error, refetch } = useQuery<TrendData>({
    queryKey: ['revenue-trend', fromParam, toParam, granularity],
    queryFn: async () => {
      const url = `${API_BASE}/api/reports/revenue-trend/?from_date=${encodeURIComponent(fromParam)}&to_date=${encodeURIComponent(toParam)}&granularity=${granularity}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as TrendData
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (data) setReportData(data as unknown as Record<string, unknown>)
  }, [data, setReportData])

  const chartData = (data?.trendBuckets ?? []).map((b) => ({
    bucket: fmtBucket(b.bucket, granularity),
    Revenue: Number(b.revenue),
    Returns: Number(b.returns),
  }))

  const peakMax = Math.max(...(data?.peakHours ?? []).map((h) => Number(h.revenue)), 1)
  const peakData = (data?.peakHours ?? []).map((h) => ({
    hour: h.hour,
    label: fmtHour(h.hour),
    revenue: Number(h.revenue),
    transactions: h.transactions,
    opacity: Math.max(0.2, Number(h.revenue) / peakMax),
  }))

  const returnRate = data?.summary.returnRate ?? 0
  const returnRateColor =
    returnRate < 3 ? 'text-green-600' : returnRate < 7 ? 'text-amber-500' : 'text-red-500'

  if (isLoading && !data) {
    return (
      <ReportLayout title="Revenue Trend">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-6 h-96 rounded-lg" />
        <Skeleton className="mt-4 h-64 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Revenue Trend">
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

  if (!data || data.trendBuckets.length === 0) {
    return (
      <ReportLayout title="Revenue Trend">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No revenue data for this period</p>
          <p className="text-sm text-text-muted">Try a different date range.</p>
        </div>
      </ReportLayout>
    )
  }

  const granularityActions = (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {(['daily', 'weekly', 'monthly'] as const).map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => setGranularity(g)}
          className={cn(
            'px-3 py-1.5 text-sm capitalize',
            granularity === g
              ? 'bg-navy text-white'
              : 'bg-white text-navy hover:bg-background',
          )}
        >
          {g}
        </button>
      ))}
    </div>
  )

  return (
    <ReportLayout title="Revenue Trend" actions={granularityActions}>
      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Revenue</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            Rs. {fmt(data.summary.totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Transactions</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            {data.summary.totalTransactions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Avg Order Value</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            Rs. {fmt(data.summary.avgOrderValue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Return Rate</p>
          <p className={cn('mt-1 font-mono text-xl font-semibold tabular-nums', returnRateColor)}>
            {data.summary.returnRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Trend Line Chart */}
      <div className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-navy">Revenue vs Returns</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => `Rs. ${new Intl.NumberFormat('en-LK', { notation: 'compact' }).format(v)}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(v) => [`Rs. ${fmt(String(v))}`, undefined]} />
            <Legend verticalAlign="top" />
            <Line
              type="monotone"
              dataKey="Revenue"
              stroke="#F97316"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Returns"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Peak Hours Chart */}
      {peakData.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-navy">Peak Sales Hours</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={peakData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
              <YAxis
                tickFormatter={(v) => `Rs. ${new Intl.NumberFormat('en-LK', { notation: 'compact' }).format(v)}`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(v, name) => [`Rs. ${fmt(String(v))}`, name]}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {peakData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={`rgba(249,115,22,${entry.opacity})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ReportLayout>
  )
}
