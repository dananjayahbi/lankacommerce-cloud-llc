'use client'

import { useQuery } from '@tanstack/react-query'
import {
  TrendingUpIcon,
  UsersIcon,
  ClockIcon,
  AlertTriangleIcon,
  BarChart3Icon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

interface PlanRevenue {
  plan_name: string
  active_count: number
  monthly_cumulative_revenue: string
}

interface MRRData {
  mrr: string
  arr: string
  active_subscribers: number
  trial_subscribers: number
  trial_to_paid_last_30: number
  churned_last_30: number
  net_churn_rate: number
  revenue_by_plan: PlanRevenue[]
}

function fmtMoney(v: string | number) {
  return `LKR ${Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
}

function MetricCard({
  label,
  value,
  icon: Icon,
  valueClassName,
  subtitle,
}: {
  label: string
  value: string
  icon: React.ElementType
  valueClassName?: string
  subtitle?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#F97316]/10">
          <Icon className="size-4 text-[#F97316]" />
        </div>
      </div>
      <p className={cn('mt-2 text-2xl font-bold', valueClassName ?? 'text-navy')}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
    </div>
  )
}

export default function MRRDashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data, isLoading, isError } = useQuery<MRRData>({
    queryKey: ['billing-mrr-metrics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/billing/admin/metrics/`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as MRRData
    },
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  })

  if (isLoading && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-border" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-text-muted">Failed to load metrics.</p>
      </div>
    )
  }

  const maxRevenue = Math.max(
    1,
    ...data.revenue_by_plan.map((p) => Number(p.monthly_cumulative_revenue)),
  )

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-navy">MRR Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="MRR"
          value={fmtMoney(data.mrr)}
          icon={TrendingUpIcon}
          valueClassName="text-green-600"
          subtitle="Monthly Recurring Revenue"
        />
        <MetricCard
          label="ARR"
          value={fmtMoney(data.arr)}
          icon={BarChart3Icon}
          subtitle="Annual Recurring Revenue"
        />
        <MetricCard
          label="Active Subscribers"
          value={data.active_subscribers.toLocaleString()}
          icon={UsersIcon}
          subtitle={`${data.trial_subscribers} on trial`}
        />
        <MetricCard
          label="Churn Rate (30d)"
          value={`${data.net_churn_rate}%`}
          icon={AlertTriangleIcon}
          valueClassName={data.net_churn_rate > 5 ? 'text-red-500' : 'text-navy'}
          subtitle={`${data.churned_last_30} churned`}
        />
      </div>

      {/* Trial → Paid Metric */}
      <div className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100">
            <ClockIcon className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Trial → Paid (Last 30 Days)</p>
            <p className="text-xl font-bold text-navy">{data.trial_to_paid_last_30} conversions</p>
          </div>
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-navy">Revenue by Plan</h2>
        {data.revenue_by_plan.length === 0 ? (
          <p className="text-sm text-text-muted">No plan data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.revenue_by_plan.map((plan) => {
              const rev = Number(plan.monthly_cumulative_revenue)
              const pct = (rev / maxRevenue) * 100
              return (
                <div key={plan.plan_name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-navy">{plan.plan_name}</span>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{plan.active_count} subscribers</span>
                      <span className="font-semibold text-navy">{fmtMoney(plan.monthly_cumulative_revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      className="h-2 rounded-full bg-[#F97316] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
