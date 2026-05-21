'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

interface HealthResponse {
  status: 'ok' | 'error'
  latency_ms: number | null
  timestamp: string
  error?: string
}

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health/`)
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    return { status: 'error', latency_ms: null, timestamp: new Date().toISOString(), ...json }
  }
  return res.json()
}

function getLatencyStatus(ms: number | null): 'green' | 'amber' | 'red' {
  if (ms === null) return 'red'
  if (ms < 150) return 'green'
  if (ms <= 500) return 'amber'
  return 'red'
}

function StatusBadge({ status }: { status: 'green' | 'amber' | 'red' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'green' && 'bg-green-100 text-green-700',
        status === 'amber' && 'bg-amber-100 text-amber-700',
        status === 'red' && 'bg-red-100 text-red-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'green' && 'bg-green-500',
          status === 'amber' && 'bg-amber-500',
          status === 'red' && 'bg-red-500',
        )}
      />
      {status === 'green' ? 'Operational' : status === 'amber' ? 'Degraded' : 'Down'}
    </span>
  )
}

interface ComponentCardProps {
  name: string
  description: string
  status: 'green' | 'amber' | 'red'
  detail?: string | undefined
}

function ComponentCard({ name, description, status, detail }: ComponentCardProps) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold text-[#1B2B3A]">{name}</p>
        <p className="mt-0.5 text-sm text-[#64748B]">{description}</p>
        {detail && <p className="mt-1 text-xs font-mono text-[#64748B]">{detail}</p>}
      </div>
      <div className="shrink-0">
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

export default function StatusPage() {
  const { data, isLoading, dataUpdatedAt } = useQuery<HealthResponse>({
    queryKey: ['health-status'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  })

  const apiStatus: 'green' | 'amber' | 'red' = isLoading ? 'amber' : data?.status === 'ok' ? 'green' : 'red'
  const dbStatus = data ? getLatencyStatus(data.latency_ms) : isLoading ? 'amber' : 'red'
  const overallStatus: 'green' | 'amber' | 'red' =
    apiStatus === 'red' || dbStatus === 'red'
      ? 'red'
      : apiStatus === 'amber' || dbStatus === 'amber'
        ? 'amber'
        : 'green'

  const bannerBg =
    overallStatus === 'green'
      ? 'bg-green-600'
      : overallStatus === 'amber'
        ? 'bg-amber-500'
        : 'bg-red-600'

  const bannerText =
    overallStatus === 'green'
      ? 'All Systems Operational'
      : overallStatus === 'amber'
        ? 'Partial Degradation Detected'
        : 'Service Disruption Detected'

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-[#F97316] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1B2B3A]">LankaCommerce Status</h1>
              <p className="text-xs text-[#64748B]">Real-time system health</p>
            </div>
          </div>
        </div>
      </header>

      {/* Overall Status Banner */}
      <div className={cn('py-8 text-white text-center', bannerBg)}>
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xl font-semibold">{bannerText}</p>
          {isLoading && (
            <p className="mt-1 text-sm opacity-80">Checking status…</p>
          )}
          {!isLoading && data?.timestamp && (
            <p className="mt-1 text-sm opacity-80">
              Last checked: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Component Cards */}
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#64748B]">Components</h2>

        <ComponentCard
          name="API"
          description="REST API — authentication, transactions, catalog"
          status={apiStatus}
          {...(data?.error ? { detail: `Error: ${data.error}` } : {})}
        />

        <ComponentCard
          name="Database"
          description="Primary data store — reads and writes"
          status={dbStatus}
          {...(data?.latency_ms !== null && data?.latency_ms !== undefined
            ? { detail: `Query latency: ${data.latency_ms} ms` }
            : {})}
        />

        <ComponentCard
          name="Authentication"
          description="JWT token issuance and validation"
          status={apiStatus}
        />

        <ComponentCard
          name="WhatsApp Notifications"
          description="Outbound WhatsApp messaging via partner gateway"
          status="green"
        />

        {/* Auto-refresh note */}
        <p className="pt-4 text-center text-xs text-[#64748B]">
          Status refreshes automatically every 30 seconds.{' '}
          {dataUpdatedAt > 0 && (
            <>Last updated at {new Date(dataUpdatedAt).toLocaleTimeString()}.</>
          )}
        </p>
      </main>
    </div>
  )
}
