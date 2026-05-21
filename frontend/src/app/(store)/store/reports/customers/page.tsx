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
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { RefreshCwIcon, TrophyIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

interface TopCustomer {
  customerId: string
  name: string
  phone: string
  totalSpend: string
  visitCount: number
  avgSpendPerVisit: string
}

interface NewVsReturning {
  week: string
  new: number
  returning: number
}

interface ChurnCustomer {
  customerId: string
  name: string
  phone: string
  lastVisitDate: string | null
  daysSinceLastVisit: number
  lifetimeSpend: string
  riskLevel: 'at_risk' | 'churned'
}

interface CustomerData {
  topCustomers: TopCustomer[]
  newVsReturning: NewVsReturning[]
  churnRisk: ChurnCustomer[]
}

function fmtMoney(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

export default function CustomerAnalyticsPage() {
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString()
  const defaultTo = new Date().toISOString()
  const fromParam = searchParams.get('from') ?? defaultFrom
  const toParam = searchParams.get('to') ?? defaultTo

  const { data, isLoading, isError, error, refetch } = useQuery<CustomerData>({
    queryKey: ['customer-analytics', fromParam, toParam],
    queryFn: async () => {
      const params = new URLSearchParams({ from_date: fromParam, to_date: toParam })
      const url = `${API_BASE}/api/reports/customers/?${params.toString()}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as CustomerData
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (data) setReportData(data as unknown as Record<string, unknown>)
  }, [data, setReportData])

  const chartData = (data?.newVsReturning ?? []).map((row) => ({
    week: (() => { try { return format(new Date(row.week), 'MMM dd') } catch { return row.week } })(),
    'New Customers': row.new,
    'Returning Customers': row.returning,
  }))

  const atRiskCount = data?.churnRisk.filter((c) => c.riskLevel === 'at_risk').length ?? 0
  const churnedCount = data?.churnRisk.filter((c) => c.riskLevel === 'churned').length ?? 0

  if (isLoading && !data) {
    return (
      <ReportLayout title="Customer Analytics">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="mt-6 h-64 rounded-lg" />
        <Skeleton className="mt-6 h-64 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Customer Analytics">
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

  if (!data || (data.topCustomers.length === 0 && data.churnRisk.length === 0)) {
    return (
      <ReportLayout title="Customer Analytics">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No customer data for this period</p>
          <p className="text-sm text-text-muted">Make sure sales are linked to customer profiles.</p>
        </div>
      </ReportLayout>
    )
  }

  return (
    <ReportLayout title="Customer Analytics">
      {/* ── Section 1: Top Customers ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-navy">Top Customers by Spend</h2>
        {data.topCustomers.length === 0 ? (
          <p className="text-sm text-text-muted">No customers found in this period.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  {['Rank', 'Name', 'Phone', 'Total Spend', 'Visits', 'Avg / Visit'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, idx) => (
                  <tr
                    key={c.customerId}
                    className={cn(
                      'border-b border-border last:border-0',
                      idx < 3 ? 'bg-[#FFFBEB]' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                    )}
                  >
                    <td className="px-3 py-2 text-text-muted">
                      <span className="flex items-center gap-1">
                        {idx < 3 && <TrophyIcon className="size-3.5 text-amber-500" />}
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-navy">{c.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text-muted">{c.phone}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-navy">
                      Rs. {fmtMoney(c.totalSpend)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-navy">{c.visitCount}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-text-muted">
                      Rs. {fmtMoney(c.avgSpendPerVisit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 2: New vs Returning ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-navy">New vs Returning Customers</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-text-muted">No weekly data available.</p>
        ) : (
          <div className="rounded-lg border border-border bg-white p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Bar dataKey="New Customers" stackId="a" fill="#E2E8F0" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Returning Customers" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Section 3: Churn Risk ── */}
      <section>
        <div className="mb-3 flex items-center gap-4">
          <h2 className="text-base font-bold text-navy">Churn Risk</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            At Risk: {atRiskCount}
          </span>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            Churned: {churnedCount}
          </span>
        </div>
        {data.churnRisk.length === 0 ? (
          <p className="text-sm text-text-muted">No customers at churn risk.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  {['Name', 'Phone', 'Last Visit', 'Days Since', 'Lifetime Spend', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.churnRisk]
                  .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
                  .map((c, idx) => (
                    <tr
                      key={c.customerId}
                      className={cn(
                        'border-b border-border last:border-0',
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-navy">{c.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-text-muted">{c.phone}</td>
                      <td className="px-3 py-2 text-text-muted">
                        {c.lastVisitDate
                          ? format(new Date(c.lastVisitDate), 'MMM dd, yyyy')
                          : '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-navy">
                        {c.daysSinceLastVisit}d
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-navy">
                        Rs. {fmtMoney(c.lifetimeSpend)}
                      </td>
                      <td className="px-3 py-2">
                        {c.riskLevel === 'at_risk' ? (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                            At Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                            Churned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ReportLayout>
  )
}
