'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const FEATURE_OPTIONS = [
  'pos_terminal', 'product_catalog', 'stock_control', 'staff_management',
  'promotions', 'crm', 'expense_tracking', 'reports',
  'whatsapp_reminders', 'multi_store', 'api_access', 'priority_support',
]

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
  sort_order: number
}

const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  monthly_price: z.string().min(1, 'Price is required'),
  annual_price: z.string().min(1, 'Annual price is required'),
  max_users: z.number().int().positive(),
  max_product_variants: z.number().int().positive(),
  features: z.array(z.string()).min(1, 'Select at least one feature'),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
})

type PlanForm = z.infer<typeof planSchema>

export default function PlansAdminPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [showForm, setShowForm] = useState(false)

  const authHeaders = (token: string | null) =>
    token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['admin-billing-plans'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/billing/admin/plans/`, {
        headers: authHeaders(accessToken),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as Plan[]
    },
    placeholderData: (prev) => prev,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlanForm>({
    resolver: standardSchemaResolver(planSchema),
    defaultValues: {
      name: '', description: '', monthly_price: '', annual_price: '',
      max_users: 5, max_product_variants: 500, features: [], is_active: true, sort_order: 0,
    },
  })

  const selectedFeatures = watch('features') ?? []

  function toggleFeature(feature: string) {
    const current = selectedFeatures
    if (current.includes(feature)) {
      setValue('features', current.filter((f) => f !== feature))
    } else {
      setValue('features', [...current, feature])
    }
  }

  function openCreate() {
    reset({
      name: '', description: '', monthly_price: '', annual_price: '',
      max_users: 5, max_product_variants: 500, features: [], is_active: true, sort_order: 0,
    })
    setEditPlan(null)
    setShowForm(true)
  }

  function openEdit(plan: Plan) {
    reset({
      name: plan.name,
      description: plan.description ?? '',
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      max_users: plan.max_users,
      max_product_variants: plan.max_product_variants,
      features: plan.features,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    })
    setEditPlan(plan)
    setShowForm(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: PlanForm) => {
      const url = editPlan
        ? `${API_BASE}/api/billing/admin/plans/${editPlan.id}/`
        : `${API_BASE}/api/billing/admin/plans/`
      const method = editPlan ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: authHeaders(accessToken),
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error?.message ?? 'Save failed')
      }
    },
    onSuccess: () => {
      toast.success(editPlan ? 'Plan updated.' : 'Plan created.')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['admin-billing-plans'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`${API_BASE}/api/billing/admin/plans/${planId}/`, {
        method: 'DELETE',
        headers: authHeaders(accessToken),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error?.message ?? 'Delete failed')
      }
    },
    onSuccess: () => {
      toast.success('Plan deleted.')
      queryClient.invalidateQueries({ queryKey: ['admin-billing-plans'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Subscription Plans</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          <PlusIcon className="size-4" />
          New Plan
        </button>
      </div>

      {/* Plan Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-border bg-[#F1F5F9] px-6 py-4">
              <h2 className="text-lg font-semibold text-navy">
                {editPlan ? `Edit "${editPlan.name}"` : 'New Plan'}
              </h2>
            </div>
            <form onSubmit={handleSubmit((v) => saveMutation.mutate(v as PlanForm))} className="space-y-4 px-6 py-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Name</label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="e.g. Starter, Pro, Enterprise"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">Monthly Price (LKR)</label>
                  <input
                    {...register('monthly_price')}
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                  {errors.monthly_price && <p className="mt-1 text-xs text-red-500">{errors.monthly_price.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">Annual Price (LKR)</label>
                  <input
                    {...register('annual_price')}
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                  {errors.annual_price && <p className="mt-1 text-xs text-red-500">{errors.annual_price.message}</p>}
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">Max Users</label>
                  <input
                    {...register('max_users')}
                    type="number"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">Max Product Variants</label>
                  <input
                    {...register('max_product_variants')}
                    type="number"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-medium text-navy mb-2">Features</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FEATURE_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFeature(f)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition',
                        selectedFeatures.includes(f)
                          ? 'border-[#F97316] bg-[#F97316]/10 font-medium text-[#F97316]'
                          : 'border-border bg-white text-text-muted hover:bg-gray-50',
                      )}
                    >
                      {selectedFeatures.includes(f) ? (
                        <CheckCircleIcon className="size-3 shrink-0" />
                      ) : (
                        <XCircleIcon className="size-3 shrink-0 opacity-30" />
                      )}
                      {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>
                  ))}
                </div>
                {errors.features && <p className="mt-1 text-xs text-red-500">{errors.features.message}</p>}
              </div>

              {/* Active + Sort */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-navy">
                  <input {...register('is_active')} type="checkbox" className="rounded" />
                  Active
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-navy">Sort Order</label>
                  <input
                    {...register('sort_order')}
                    type="number"
                    className="w-16 rounded-lg border border-border px-2 py-1 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || saveMutation.isPending}
                  className="flex-1 rounded-lg bg-[#F97316] py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Saving…' : editPlan ? 'Save Changes' : 'Create Plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-border py-2 text-sm text-navy hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans Table */}
      {isLoading && !plans ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-border" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#F1F5F9]">
                {['Name', 'Monthly', 'Annual', 'Max Users', 'Max Variants', 'Features', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(plans ?? []).map((plan, idx) => (
                <tr
                  key={plan.id}
                  className={cn('border-b border-border last:border-0', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]')}
                >
                  <td className="px-4 py-2.5 font-semibold text-navy">{plan.name}</td>
                  <td className="px-4 py-2.5 tabular-nums text-navy">LKR {Number(plan.monthly_price).toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-navy">LKR {Number(plan.annual_price).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-navy">{plan.max_users}</td>
                  <td className="px-4 py-2.5 text-navy">{plan.max_product_variants.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">{(plan.features ?? []).length} features</td>
                  <td className="px-4 py-2.5">
                    {plan.is_active ? (
                      <CheckCircleIcon className="size-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-4 text-text-muted" />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(plan)}
                        className="rounded p-1 hover:bg-[#F97316]/10 text-[#F97316]"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete "${plan.name}"?`)) {
                            deleteMutation.mutate(plan.id)
                          }
                        }}
                        className="rounded p-1 hover:bg-red-50 text-red-500"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
