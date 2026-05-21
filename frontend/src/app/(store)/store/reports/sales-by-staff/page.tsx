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

interface StaffRow {
  userId: string
  staffName: string
  role: string
  transactionCount: number
  totalRevenue: string
  avgTransactionValue: string
  commissionEarned: string
}

type SortKey = keyof StaffRow
type SortDir = 'asc' | 'desc'

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-navy text-white',
  MANAGER: 'bg-orange text-white',
  CASHIER: 'bg-border text-navy',
}

function fmt(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

export default function SalesByStaffPage() {
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const defaultFrom = subDays(startOfToday(), 29).toISOString()
  const defaultTo = endOfToday().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  const { data, isLoading, isError, error, refetch } = useQuery<{ rows: StaffRow[] }>({
    queryKey: ['sales-by-staff', fromParam, toParam],
    queryFn: async () => {
      const url = `${API_BASE}/api/reports/sales-by-staff/?from_date=${encodeURIComponent(fromParam)}&to_date=${encodeURIComponent(toParam)}`
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
    .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
    .slice(0, 10)
    .map((r) => ({ name: r.staffName, totalRevenue: Number(r.totalRevenue) }))

  if (isLoading && !data) {
    return (
      <ReportLayout title="Sales by Staff">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="mt-4 h-48 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Sales by Staff">
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
      <ReportLayout title="Sales by Staff">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No data for this period</p>
          <p className="text-sm text-text-muted">No sales data for this period. Try a different date range.</p>
        </div>
      </ReportLayout>
    )
  }

  const cols: { key: SortKey; label: string; right?: boolean }[] = [
    { key: 'staffName', label: 'Staff Name' },
    { key: 'role', label: 'Role' },
    { key: 'transactionCount', label: 'Transactions', right: true },
    { key: 'totalRevenue', label: 'Total Revenue', right: true },
    { key: 'avgTransactionValue', label: 'Avg Transaction', right: true },
    { key: 'commissionEarned', label: 'Commission Earned', right: true },
  ]

  return (
    <ReportLayout title="Sales by Staff">
      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">Top 10 Staff by Revenue</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tickFormatter={(v) => `Rs. ${new Intl.NumberFormat('en-LK', { notation: 'compact' }).format(v)}`} tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v) => [`Rs. ${fmt(String(v))}`, 'Revenue']} />
              <Bar dataKey="totalRevenue" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {cols.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={cn('cursor-pointer select-none px-4 py-2 font-semibold text-navy', col.right ? 'text-right' : 'text-left')}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.key === sortKey ? (sortDir === 'asc' ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />) : <ChevronUpIcon className="size-3 opacity-30" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.userId} className="border-b border-border hover:bg-[#F8FAFC]">
                  <td className="px-4 py-2 font-medium text-navy">{row.staffName}</td>
                  <td className="px-4 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ROLE_COLORS[row.role] ?? 'bg-border text-navy')}>
                      {row.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-navy">{row.transactionCount}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-navy">Rs. {fmt(row.totalRevenue)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-navy">Rs. {fmt(row.avgTransactionValue)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-navy">Rs. {fmt(row.commissionEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportLayout>
  )
}
