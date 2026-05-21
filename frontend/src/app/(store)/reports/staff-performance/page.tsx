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
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { RefreshCwIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-navy text-white',
  SUPER_ADMIN: 'bg-navy text-white',
  MANAGER: 'bg-[#F97316] text-white',
  CASHIER: 'border border-border text-navy bg-white',
  STOCK_CLERK: 'border border-border text-text-muted bg-white',
}

interface StaffRow {
  userId: string
  staffName: string
  role: string
  hoursWorked: number
  transactionCount: number
  totalRevenue: string
  avgTransactionValue: string
  commissionEarned: string
  commissionPaid: string
}

interface StaffData {
  rows: StaffRow[]
  isRestricted: boolean
}

function fmtMoney(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

function fmtHours(h: number) {
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  return `${hours}h ${mins}m`
}

export default function StaffPerformancePage() {
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { role } = usePermissions()
  const { setReportData } = useReportContext()

  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString()
  const defaultTo = new Date().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  const { data, isLoading, isError, error, refetch } = useQuery<StaffData>({
    queryKey: ['staff-performance', fromParam, toParam],
    queryFn: async () => {
      const params = new URLSearchParams({ from_date: fromParam, to_date: toParam })
      const url = `${API_BASE}/api/reports/staff-performance/?${params.toString()}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as StaffData
    },
    placeholderData: (prev) => prev,
    enabled: role !== 'STOCK_CLERK',
  })

  useEffect(() => {
    if (data) setReportData(data as Record<string, unknown>)
  }, [data, setReportData])

  if (role === 'STOCK_CLERK') {
    return (
      <ReportLayout title="Staff Performance">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-8 text-center">
          <p className="text-navy font-medium">You do not have permission to view this report.</p>
          <p className="text-sm text-text-muted">Please contact your manager.</p>
        </div>
      </ReportLayout>
    )
  }

  if (isLoading && !data) {
    return (
      <ReportLayout title="Staff Performance">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="mt-4 h-96 rounded-lg" />
        <Skeleton className="mt-4 h-64 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Staff Performance">
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
      <ReportLayout title="Staff Performance">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No staff performance data for this period</p>
          <p className="text-sm text-text-muted">Try a different date range.</p>
        </div>
      </ReportLayout>
    )
  }

  const avgRevenue =
    data.rows.reduce((acc, r) => acc + Number(r.totalRevenue), 0) / (data.rows.length || 1)

  const chartData = data.rows.map((r) => ({
    staffName: r.staffName,
    totalRevenue: Number(r.totalRevenue),
  }))

  return (
    <ReportLayout title="Staff Performance">
      {data.isRestricted && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>You are viewing your own performance data only.</span>
        </div>
      )}

      {/* Table */}
      <div className="mb-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {['Staff Name', 'Role', 'Hours Worked', 'Sales', 'Total Revenue', 'Avg Transaction', 'Commission Earned', 'Commission Paid'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr
                key={row.userId}
                className={cn(
                  'border-b border-border last:border-0',
                  idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                )}
              >
                <td className="px-3 py-2 font-medium text-navy">{row.staffName}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                      ROLE_BADGE[row.role] ?? 'border border-border bg-white text-navy',
                    )}
                  >
                    {row.role}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-navy">{fmtHours(row.hoursWorked)}</td>
                <td className="px-3 py-2 tabular-nums text-navy">{row.transactionCount}</td>
                <td className="px-3 py-2 font-mono tabular-nums text-navy">
                  Rs. {fmtMoney(row.totalRevenue)}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums text-text-muted">
                  Rs. {fmtMoney(row.avgTransactionValue)}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums text-navy">
                  Rs. {fmtMoney(row.commissionEarned)}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums text-navy">
                  Rs. {fmtMoney(row.commissionPaid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar Chart */}
      <div className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-navy">Revenue by Staff Member</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) =>
                `Rs. ${new Intl.NumberFormat('en-LK', { notation: 'compact' }).format(v)}`
              }
              tick={{ fontSize: 11 }}
            />
            <YAxis type="category" dataKey="staffName" tick={{ fontSize: 12 }} width={80} />
            <Tooltip formatter={(v) => [`Rs. ${fmtMoney(String(v))}`, 'Revenue']} />
            <ReferenceLine
              x={avgRevenue}
              stroke="#64748B"
              strokeDasharray="5 5"
              label={{ value: 'Avg', position: 'top', fontSize: 11, fill: '#64748B' }}
            />
            <Bar dataKey="totalRevenue" fill="#F97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ReportLayout>
  )
}
