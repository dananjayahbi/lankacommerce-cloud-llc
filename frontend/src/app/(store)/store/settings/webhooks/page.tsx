'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  CopyIcon,
  EyeOffIcon,
  ZapIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const EVENT_TYPES = [
  'sale.completed',
  'return.processed',
  'stock.updated',
  'product.created',
  'product.updated',
  'customer.created',
]

interface WebhookEndpoint {
  id: number
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

interface CreatedEndpoint extends WebhookEndpoint {
  secret: string
}

const formSchema = z.object({
  url: z.string().url('Must be a valid URL').startsWith('https://', 'Must use HTTPS'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
})

type FormValues = z.infer<typeof formSchema>

export default function WebhooksPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [revealSecret, setRevealSecret] = useState<CreatedEndpoint | null>(null)

  const authHeaders = (token: string | null) =>
    token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }

  const { data: endpoints, isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ['webhook-endpoints'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/`, {
        headers: authHeaders(accessToken),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as WebhookEndpoint[]
    },
    placeholderData: (prev) => prev,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: { url: '', events: [] },
  })

  const selectedEvents = watch('events') ?? []

  const createMutation = useMutation<CreatedEndpoint, Error, FormValues>({
    mutationFn: async (values) => {
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error?.message ?? 'Failed to create endpoint')
      }
      const json = await res.json()
      return json.data as CreatedEndpoint
    },
    onSuccess: (data) => {
      reset()
      setShowForm(false)
      setRevealSecret(data)
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/${id}/`, {
        method: 'DELETE',
        headers: authHeaders(accessToken),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error?.message ?? 'Delete failed')
      }
    },
    onSuccess: () => {
      toast.success('Endpoint removed.')
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] })
    },
    onError: (err) => toast.error(err.message),
  })

  function toggleEvent(event: string) {
    const current = selectedEvents
    if (current.includes(event)) {
      setValue('events', current.filter((e) => e !== event))
    } else {
      setValue('events', [...current, event])
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Webhooks</h1>
          <p className="mt-1 text-sm text-text-muted">
            Receive real-time event notifications at your HTTPS endpoints.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); reset() }}
          className="flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          <PlusIcon className="size-4" /> Add Endpoint
        </button>
      </div>

      {/* Secret Reveal Modal */}
      {revealSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl bg-amber-50 px-6 py-5 border-b border-amber-200">
              <div className="flex items-center gap-2 text-amber-700">
                <EyeOffIcon className="size-5" />
                <span className="font-semibold">Save your signing secret</span>
              </div>
              <p className="mt-2 text-sm text-amber-600">
                This secret will <strong>not be shown again</strong>. Store it securely in your application.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-navy mb-1">Endpoint URL</p>
                <p className="text-sm font-mono text-navy break-all">{revealSecret.url}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-navy mb-1">Signing Secret</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-[#F1F5F9] px-3 py-2">
                  <code className="flex-1 text-xs font-mono text-navy break-all">{revealSecret.secret}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(revealSecret.secret)
                      toast.success('Copied!')
                    }}
                    className="shrink-0 rounded p-1 hover:bg-[#F97316]/10 text-[#F97316]"
                  >
                    <CopyIcon className="size-4" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevealSecret(null)}
                className="w-full rounded-lg bg-[#F97316] py-2.5 text-sm font-medium text-white hover:bg-orange-600"
              >
                I have saved the secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-navy">New Webhook Endpoint</h2>
          <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy mb-1">HTTPS URL</label>
              <input
                {...register('url')}
                placeholder="https://yourapp.com/webhooks/lankacommerce"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
              {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-navy mb-2">Events to Subscribe</label>
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                {EVENT_TYPES.map((evt) => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvent(evt)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-left transition',
                      selectedEvents.includes(evt)
                        ? 'border-[#F97316] bg-[#F97316]/10 text-[#F97316] font-medium'
                        : 'border-border bg-white text-text-muted hover:bg-gray-50',
                    )}
                  >
                    <ZapIcon className="size-3 shrink-0" />
                    {evt}
                  </button>
                ))}
              </div>
              {errors.events && <p className="mt-1 text-xs text-red-500">{errors.events.message}</p>}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="rounded-lg bg-[#F97316] px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Endpoint'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-5 py-2 text-sm text-navy hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Endpoints Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[#F1F5F9]">
              {['URL', 'Events', 'Status', 'Created', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-text-muted">Loading…</td>
              </tr>
            )}
            {!isLoading && (!endpoints || endpoints.length === 0) && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-text-muted">
                  No webhook endpoints configured. Add one to start receiving events.
                </td>
              </tr>
            )}
            {(endpoints ?? []).map((ep, idx) => (
              <tr
                key={ep.id}
                className={cn('border-b border-border last:border-0', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]')}
              >
                <td className="px-4 py-2.5 max-w-xs">
                  <span className="block truncate font-mono text-xs text-navy">{ep.url}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {ep.events.map((e) => (
                      <span key={e} className="rounded bg-[#F97316]/10 px-1.5 py-0.5 text-xs text-[#F97316]">
                        {e}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {ep.is_active ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircleIcon className="size-3.5" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <XCircleIcon className="size-3.5" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-text-muted">
                  {new Date(ep.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Remove this webhook endpoint?')) {
                        deleteMutation.mutate(ep.id)
                      }
                    }}
                    className="rounded p-1 hover:bg-red-50 text-red-500"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
