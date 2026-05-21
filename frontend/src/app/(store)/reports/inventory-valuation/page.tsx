'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { RefreshCwIcon, ArrowUpDownIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useReportContext } from '@/lib/reports/ReportContext'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

interface InventoryRow {
  variantId: string
  sku: string
  productName: string
  variantName: string
  stockQuantity: number
  costPrice: string
  stockValue: string
  lowStockThreshold: number
  isLowStock: boolean
  lastSaleDate: string | null
  isDeadStock: boolean
}

interface InventoryData {
  summary: {
    totalSkus: number
    totalUnits: number
    totalStockValue: string
  }
  rows: InventoryRow[]
}

type SortKey = keyof InventoryRow
type SortDir = 'asc' | 'desc'

function fmtMoney(val: string | number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val))
}

export default function InventoryValuationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setReportData } = useReportContext()

  const lowStockOnly = searchParams.get('low_stock_only') === 'true'
  const deadStockOnly = searchParams.get('dead_stock_only') === 'true'

  const [sortKey, setSortKey] = useState<SortKey>('stockValue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleFilter(key: 'low_stock_only' | 'dead_stock_only', current: boolean) {
    const params = new URLSearchParams(searchParams.toString())
    if (current) {
      params.delete(key)
    } else {
      params.set(key, 'true')
    }
    router.replace(pathname + '?' + params.toString())
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const { data, isLoading, isError, error, refetch } = useQuery<InventoryData>({
    queryKey: ['inventory-valuation', lowStockOnly, deadStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (lowStockOnly) params.set('low_stock_only', 'true')
      if (deadStockOnly) params.set('dead_stock_only', 'true')
      const url = `${API_BASE}/api/reports/inventory-valuation/?${params.toString()}`
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.data as InventoryData
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (data) setReportData(data as Record<string, unknown>)
  }, [data, setReportData])

  const sortedRows = [...(data?.rows ?? [])].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    const numeric = ['stockQuantity', 'costPrice', 'stockValue', 'lowStockThreshold'].includes(sortKey)
    if (numeric) {
      const diff = Number(aVal) - Number(bVal)
      return sortDir === 'asc' ? diff : -diff
    }
    const diff = String(aVal).localeCompare(String(bVal))
    return sortDir === 'asc' ? diff : -diff
  })

  const footerUnits = sortedRows.reduce((acc, r) => acc + r.stockQuantity, 0)
  const footerValue = sortedRows.reduce((acc, r) => acc + Number(r.stockValue), 0)

  function SortBtn({ k }: { k: SortKey }) {
    return (
      <button type="button" onClick={() => toggleSort(k)} className="ml-1 inline-flex opacity-60 hover:opacity-100">
        <ArrowUpDownIcon className="size-3.5" />
      </button>
    )
  }

  function ToggleSwitch({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
    return (
      <label className="flex cursor-pointer items-center gap-2">
        <span className="text-sm text-navy">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={onToggle}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors',
            active ? 'bg-orange-500' : 'bg-gray-200',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              active ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </button>
      </label>
    )
  }

  if (isLoading && !data) {
    return (
      <ReportLayout title="Inventory Valuation">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-6 h-96 rounded-lg" />
      </ReportLayout>
    )
  }

  if (isError) {
    return (
      <ReportLayout title="Inventory Valuation">
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

  const filterActions = (
    <div className="flex items-center gap-4">
      <ToggleSwitch
        label="Low Stock Only"
        active={lowStockOnly}
        onToggle={() => toggleFilter('low_stock_only', lowStockOnly)}
      />
      <ToggleSwitch
        label="Dead Stock Only"
        active={deadStockOnly}
        onToggle={() => toggleFilter('dead_stock_only', deadStockOnly)}
      />
    </div>
  )

  return (
    <ReportLayout title="Inventory Valuation" actions={filterActions}>
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total SKUs</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            {(data?.summary.totalSkus ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Units</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            {(data?.summary.totalUnits ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs text-text-muted">Total Stock Value</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-navy">
            Rs. {fmtMoney(data?.summary.totalStockValue ?? 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      {!data || sortedRows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium text-navy">No active variants found</p>
          <p className="text-sm text-text-muted">Try adjusting the filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {(
                  [
                    { key: 'sku', label: 'SKU' },
                    { key: 'productName', label: 'Product' },
                    { key: 'variantName', label: 'Variant' },
                    { key: 'stockQuantity', label: 'Stock Qty' },
                    { key: 'costPrice', label: 'Cost Price' },
                    { key: 'stockValue', label: 'Stock Value' },
                    { key: 'lastSaleDate', label: 'Last Sale' },
                  ] as { key: SortKey; label: string }[]
                ).map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-3 py-2 text-left text-xs font-medium text-text-muted"
                  >
                    {label}
                    <SortBtn k={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => (
                <tr
                  key={row.variantId}
                  className={cn(
                    'border-b border-border last:border-0',
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                    row.isDeadStock && 'border-l-2 border-l-amber-400',
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs text-navy">{row.sku}</td>
                  <td className="px-3 py-2 text-navy">{row.productName}</td>
                  <td className="px-3 py-2 text-text-muted">{row.variantName}</td>
                  <td
                    className={cn(
                      'px-3 py-2 font-mono text-right tabular-nums',
                      row.isLowStock ? 'font-bold text-red-500' : 'text-navy',
                    )}
                  >
                    {row.stockQuantity.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-right tabular-nums text-navy">
                    Rs. {fmtMoney(row.costPrice)}
                  </td>
                  <td className="px-3 py-2 font-mono text-right tabular-nums text-navy">
                    Rs. {fmtMoney(row.stockValue)}
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {row.lastSaleDate ? (
                      format(new Date(row.lastSaleDate), 'MMM dd, yyyy')
                    ) : (
                      <span className="italic text-text-muted">Never</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-background font-semibold">
                <td colSpan={3} className="px-3 py-2 text-xs text-text-muted">
                  Totals ({sortedRows.length} rows)
                </td>
                <td className="px-3 py-2 font-mono text-right tabular-nums text-navy">
                  {footerUnits.toLocaleString()}
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 font-mono text-right tabular-nums text-navy">
                  Rs. {fmtMoney(footerValue)}
                </td>
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportLayout>
  )
}
