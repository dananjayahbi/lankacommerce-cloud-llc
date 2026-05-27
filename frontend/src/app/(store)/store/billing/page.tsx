'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCardIcon,
  CalendarIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  XCircleIcon,
  DownloadIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

interface Plan {
  id: string
  name: string
  description: string | null
  monthly_price: string
  annual_price: string
  max_users: number
  max_product_variants: number
  features: string[]
  is_active: boolean
}

interface SubscriptionData {
  subscription_id: string
  plan_name: string
  plan_monthly_price: string
  plan_annual_price: string
  plan_features: string[]
  status: string
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  days_remaining: number
}

interface InvoiceItem {
  id: string
  invoice_number: string
  amount: string
  status: string
  billing_period_start: string
  billing_period_end: string
  due_date: string
  paid_at: string | null
}

interface BillingOverview {
  subscription: SubscriptionData
  invoices: InvoiceItem[]
  pending_invoice_id: string | null
}

interface StripeCheckoutResult {
  stripe_checkout_url: string
}

function fmtMoney(v: string | number) {
  return `LKR ${Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    TRIAL: { label: 'Trial', className: 'bg-blue-100 text-blue-700' },
    ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
    PAST_DUE: { label: 'Past Due', className: 'bg-amber-100 text-amber-700' },
    SUSPENDED: { label: 'Suspended', className: 'bg-red-100 text-red-600' },
    CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' },
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'Paid', className: 'bg-green-100 text-green-700' },
    FAILED: { label: 'Failed', className: 'bg-red-100 text-red-600' },
    VOIDED: { label: 'Voided', className: 'bg-gray-100 text-gray-600' },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'ACTIVE') return <CheckCircleIcon className="size-5 text-green-500" />
  if (status === 'TRIAL') return <ClockIcon className="size-5 text-blue-500" />
  if (status === 'PAST_DUE') return <AlertTriangleIcon className="size-5 text-amber-500" />
  if (status === 'SUSPENDED') return <AlertCircleIcon className="size-5 text-red-500" />
  return <XCircleIcon className="size-5 text-gray-400" />
}

export default function BillingPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const headers = (token: string | null) =>
    token ? { Authorization: `Bearer ${token}` } : {}

  // Fetch billing overview
  const { data, isLoading, isError } = useQuery<BillingOverview>({
    queryKey: ['billing-overview'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/billing/subscription/`, {
        headers: headers(accessToken),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as BillingOverview
    },
    placeholderData: (prev) => prev,
  })

  // Fetch all plans (public)
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/billing/admin/plans/`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as Plan[]
    },
    placeholderData: (prev) => prev,
  })

  // Checkout mutation — redirects to Stripe Checkout
  const checkoutMutation = useMutation<StripeCheckoutResult, Error, string>({
    mutationFn: async (planId: string) => {
      const res = await fetch(`${API_BASE}/api/billing/stripe/checkout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers(accessToken) },
        body: JSON.stringify({ plan_id: planId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error?.message ?? 'Checkout failed')
      }
      const json = await res.json()
      return json.data as StripeCheckoutResult
    },
    onSuccess: (result) => {
      // Redirect browser to the Stripe Checkout page
      window.location.href = result.stripe_checkout_url
    },
    onError: (err) => toast.error(err.message),
  })

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/billing/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers(accessToken) },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error?.message ?? 'Cancellation failed')
      }
    },
    onSuccess: () => {
      toast.success('Subscription cancelled. Access continues until end of period.')
      setShowCancelConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['billing-overview'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading && !data) {
    return (
      <div className="space-y-4 p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-border" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-text-muted">Failed to load billing information.</p>
      </div>
    )
  }

  const sub = data.subscription
  const isPastDue = sub.status === 'PAST_DUE'
  const isTrial = sub.status === 'TRIAL'

  const activePlans = plans?.filter((p) => p.is_active) ?? []

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-navy">Billing & Subscription</h1>

      {/* Status Banner */}
      {(isPastDue || sub.status === 'SUSPENDED') && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircleIcon className="size-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-700">
              {sub.status === 'SUSPENDED' ? 'Account Suspended' : 'Payment Overdue'}
            </p>
            <p className="text-sm text-red-600">
              {sub.status === 'SUSPENDED'
                ? 'Your account is suspended. Please make a payment to restore access.'
                : 'Your payment is overdue. Please pay now to avoid suspension.'}
            </p>
          </div>
          {data.pending_invoice_id && (
            <button
              type="button"
              onClick={() => checkoutMutation.mutate(sub.plan_monthly_price)}
              className="ml-auto shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Pay Now
            </button>
          )}
        </div>
      )}

      {/* Current Subscription Card */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#F97316]/10">
              <CreditCardIcon className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Current Plan</p>
              <p className="text-xl font-bold text-navy">{sub.plan_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={sub.status} />
            <StatusBadge status={sub.status} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-text-muted">Monthly Price</p>
            <p className="font-semibold text-navy">{fmtMoney(sub.plan_monthly_price)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Billing Period</p>
            <p className="font-semibold text-navy">
              {fmtDate(sub.current_period_start)} → {fmtDate(sub.current_period_end)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">
              {isTrial ? 'Trial Ends' : 'Days Remaining'}
            </p>
            <p className={cn('font-semibold', sub.days_remaining < 5 ? 'text-red-500' : 'text-navy')}>
              {isTrial ? fmtDate(sub.trial_ends_at) : `${sub.days_remaining} days`}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Features</p>
            <p className="text-sm text-navy">{sub.plan_features.length} features</p>
          </div>
        </div>

        {sub.cancel_at_period_end && (
          <p className="mt-3 text-sm text-amber-600">
            Your subscription will cancel on {fmtDate(sub.current_period_end)}.
          </p>
        )}

        {!sub.cancel_at_period_end && sub.status === 'ACTIVE' && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs text-text-muted underline hover:text-red-500"
            >
              Cancel subscription
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirm */}
      {showCancelConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-medium text-red-700">Cancel subscription?</p>
          <p className="mt-1 text-sm text-red-600">
            Access continues until {fmtDate(sub.current_period_end)}. This cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel'}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="rounded-lg border border-border bg-white px-4 py-1.5 text-sm text-navy hover:bg-gray-50"
            >
              Keep subscription
            </button>
          </div>
        </div>
      )}

      {/* Available Plans */}
      {activePlans.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-navy">Available Plans</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activePlans.map((plan) => {
              const isCurrent = plan.name === sub.plan_name
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'rounded-xl border p-5 transition',
                    isCurrent ? 'border-[#F97316] bg-[#F97316]/5' : 'border-border bg-white',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-navy">{plan.name}</p>
                    {isCurrent && (
                      <span className="rounded-full bg-[#F97316] px-2 py-0.5 text-xs font-medium text-white">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-2xl font-bold text-navy">
                    {fmtMoney(plan.monthly_price)}
                    <span className="text-sm font-normal text-text-muted">/month</span>
                  </p>
                  {plan.description && <p className="mt-1 text-xs text-text-muted">{plan.description}</p>}
                  <ul className="mt-3 space-y-1">
                    {(plan.features ?? []).slice(0, 6).map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-navy">
                        <CheckCircleIcon className="size-3.5 text-green-500" />
                        {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-xs text-text-muted">
                    Up to {plan.max_users} users &bull; {plan.max_product_variants.toLocaleString()} variants
                  </div>
                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={checkoutMutation.isPending && checkoutPlanId === plan.id}
                      onClick={() => {
                        setCheckoutPlanId(plan.id)
                        checkoutMutation.mutate(plan.id)
                      }}
                      className="mt-4 w-full rounded-lg bg-[#F97316] py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
                    >
                      {checkoutMutation.isPending && checkoutPlanId === plan.id
                        ? 'Redirecting…'
                        : 'Upgrade / Switch'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Invoices */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy">Recent Invoices</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#F1F5F9]">
                {['Invoice', 'Amount', 'Period', 'Due Date', 'Paid At', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-text-muted">
                    No invoices yet.
                  </td>
                </tr>
              )}
              {data.invoices.map((inv, idx) => (
                <tr
                  key={inv.id}
                  className={cn(
                    'border-b border-border last:border-0',
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-navy">{inv.invoice_number}</td>
                  <td className="px-4 py-2.5 tabular-nums text-navy">{fmtMoney(inv.amount)}</td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">
                    {fmtDate(inv.billing_period_start)} → {fmtDate(inv.billing_period_end)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-navy">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-2.5 text-xs text-navy">{fmtDate(inv.paid_at)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <a
                      href={`${API_BASE}/api/billing/invoices/${inv.id}/pdf/?token=${accessToken ?? ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#F97316] hover:underline"
                    >
                      <DownloadIcon className="size-3" /> PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
