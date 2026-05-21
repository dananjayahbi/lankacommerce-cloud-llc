'use client'

import { useEffect } from 'react'
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
  Legend,
} from 'recharts'
import { format, subDays, startOfToday, endOfToday } from 'date-fns'
import { RefreshCwIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

interface ExpenseRow {
  category: string
  total: string
}

interface MonthlyRow {
  month: string
  revenue: string
  cogs: string
  expenses: string
  grossProfit: string
  netProfit: string
}

interface PLData {
  totalRevenue: string
  totalReturns: string
  netRevenue: string
  totalCogs: string
  returnedCogs: string
  netCogs: string
  grossProfit: string
  grossMargin: string
  totalExpenses: string
  expensesByCategory: ExpenseRow[]
  netProfit: string
  paymentBreakdown: { method: string; amount: string }[]
  monthlyBreakdown: MonthlyRow[]
}

function fmt(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

function MoneyCell({ value, red }: { value: string; red?: boolean }) {
  const num = Number(value)
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        red || num < 0 ? 'text-red-500' : undefined,
      )}
    >
      Rs. {fmt(value)}
    </span>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="bg-navy px-4 py-2 text-sm font-semibold text-white"
      >
        {label}
      </td>
    </tr>
  )
}

function PLRow({
  label,
  value,
  bold,
  red,
  large,
}: {
  label: string
  value: string
  bold?: boolean
  red?: boolean
  large?: boolean
}) {
  const num = Number(value)
  return (
    <tr className="border-b border-border even:bg-background">
      <td className={cn('px-4 py-2 text-sm text-navy', bold && 'font-semibold', large && 'text-base')}>
        {label}
      </td>
      <td className="px-4 py-2 text-right">
        <span
          className={cn(
            'font-mono tabular-nums text-sm',
            bold && 'font-semibold',
            large && 'text-base',
            red || num < 0 ? 'text-red-500' : 'text-navy',
          )}
        >
          Rs. {fmt(value)}
        </span>
      </td>
    </tr>
  )
}

export default function ProfitLossPage() {
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const defaultFrom = subDays(startOfToday(), 29).toISOString()
  const defaultTo = endOfToday().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  const { data, isLoading, isError, error, refetch } = useQuery<PLData>({
    queryKey: ['profit-loss', fromParam, toParam],
    queryFn: async () => {
      const url = `${API_BASE}/api/reports/profit-loss/?from_date=${encodeURIComponent(fromParam)}&to_date=${encodeURIComponent(toParam)}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as PLData
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (data) setReportData(data as unknown as Record<string, unknown>)
  }, [data, setReportData])

  if (isLoading && !data) {
    return (
      <ReportLayout title="Profit & Loss">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Profit & Loss">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Failed to load report.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700"
          >
            <RefreshCwIcon className="size-4" />
            Retry
          </button>
        </div>
      </ReportLayout>
    )
  }

  if (!data || Number(data.netRevenue) === 0) {
    return (
      <ReportLayout title="Profit & Loss">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No data for this period</p>
          <p className="text-sm text-text-muted">
            No sales data for this period. Try a different date range.
          </p>
        </div>
      </ReportLayout>
    )
  }

  const chartData = data.monthlyBreakdown.map((row) => ({
    month: (() => {
      try {
        return format(new Date(row.month), 'MMM yyyy')
      } catch {
        return row.month
      }
    })(),
    Revenue: Number(row.revenue),
    COGS: Number(row.cogs),
    'Net Profit': Number(row.netProfit),
  }))

  const netProfitNum = Number(data.netProfit)

  return (
    <ReportLayout title="Profit & Loss">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Net Revenue', value: data.netRevenue, green: true },
          { label: 'Gross Profit', value: data.grossProfit },
          { label: 'Gross Margin', value: data.grossMargin, pct: true },
          {
            label: 'Net Profit',
            value: data.netProfit,
            green: netProfitNum >= 0,
            red: netProfitNum < 0,
          },
        ].map(({ label, value, green, red, pct }) => (
          <div key={label} className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs text-text-muted">{label}</p>
            <p
              className={cn(
                'mt-1 font-mono text-xl font-semibold tabular-nums',
                green ? 'text-green-600' : red ? 'text-red-500' : 'text-navy',
              )}
            >
              {pct ? `${fmt(value)}%` : `Rs. ${fmt(value)}`}
            </p>
          </div>
        ))}
      </div>

      {/* P&L Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full">
          <tbody>
            <SectionHeader label="Revenue" />
            <PLRow label="Total Sales" value={data.totalRevenue} />
            <PLRow label="Less: Returns" value={data.totalReturns} red />
            <PLRow label="Net Revenue" value={data.netRevenue} bold large />

            <SectionHeader label="Cost of Goods Sold" />
            <PLRow label="COGS" value={data.totalCogs} />
            <PLRow label="Less: Returned COGS" value={data.returnedCogs} red />
            <PLRow label="Net COGS" value={data.netCogs} bold />

            <SectionHeader label="Gross Profit" />
            <PLRow label="Gross Profit" value={data.grossProfit} bold large />
            <tr className="border-b border-border even:bg-background">
              <td className="px-4 py-2 text-sm font-semibold text-navy">Gross Margin %</td>
              <td className="px-4 py-2 text-right font-mono text-sm font-semibold tabular-nums text-navy">
                {fmt(data.grossMargin)}%
              </td>
            </tr>

            <SectionHeader label="Expenses" />
            {data.expensesByCategory.map((exp) => (
              <PLRow key={exp.category} label={exp.category} value={exp.total} />
            ))}
            <PLRow label="Total Expenses" value={data.totalExpenses} bold />

            <SectionHeader label="Net Profit" />
            <PLRow
              label="Net Profit"
              value={data.netProfit}
              bold
              large
              red={netProfitNum < 0}
            />
          </tbody>
        </table>
      </div>

      {/* Monthly Chart */}
      {chartData.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-navy">Monthly Breakdown</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `Rs. ${new Intl.NumberFormat('en-LK', { notation: 'compact' }).format(v)}`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`Rs. ${fmt(String(value))}`, undefined]}
              />
              <Legend />
              <Bar dataKey="Revenue" fill="#F97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="COGS" fill="#1B2B3A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Net Profit" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ReportLayout>
  )
}
