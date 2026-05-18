"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  PackageIcon,
  AlertTriangleIcon,
  ClipboardListIcon,
  LockIcon,
  PencilIcon,
  ListIcon,
  ClipboardCheckIcon,
  BarChart2Icon,
  ChevronRightIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";
import type { StockMovement } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCurrency(val: string | number) {
  return `Rs. ${Number(val).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
}

async function apiFetch<T>(url: string, token: string | null): Promise<T> {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return json.data as T;
}

// ── reason badge ─────────────────────────────────────────────────────────────

const REASON_STYLES: Record<string, string> = {
  INITIAL_STOCK: "bg-blue-100 text-blue-700",
  PURCHASE_RECEIPT: "bg-blue-100 text-blue-700",
  SALE_RETURN: "bg-green-100 text-green-700",
  SALE: "bg-green-100 text-green-700",
  DAMAGE_WRITE_OFF: "bg-amber-100 text-amber-700",
  MANUAL_ADJUSTMENT: "bg-amber-100 text-amber-700",
  TRANSFER_IN: "bg-amber-100 text-amber-700",
  TRANSFER_OUT: "bg-amber-100 text-amber-700",
  STOCK_TAKE_ADJUSTMENT: "bg-slate-100 text-slate-500",
};

const REASON_LABELS: Record<string, string> = {
  INITIAL_STOCK: "Initial Stock",
  PURCHASE_RECEIPT: "Purchase Received",
  SALE_RETURN: "Sale Return",
  SALE: "Sale",
  DAMAGE_WRITE_OFF: "Damaged",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  STOCK_TAKE_ADJUSTMENT: "Stock Take",
};

// ── permission denied ─────────────────────────────────────────────────────────

function PermissionDenied() {
  return (
    <div className="rounded-xl border border-border bg-white p-8 text-center">
      <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-[#1B2B3A]">Access Restricted</h2>
      <p className="mt-1 text-sm text-[#64748B]">
        You don't have permission to access Stock Control. Contact your store owner.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  valueClass = "text-[#1B2B3A]",
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
      <div className="mt-3">
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={cn("text-2xl font-semibold", valueClass)}>{value}</p>
        )}
        <p className="mt-1 text-sm text-[#64748B]">{label}</p>
      </div>
    </div>
  );
}

// ── action card ───────────────────────────────────────────────────────────────

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-l-4 hover:border-l-[#1B2B3A]"
    >
      <div className="mt-0.5 text-[#1B2B3A]">{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-[#1B2B3A]">{title}</p>
        <p className="mt-0.5 text-sm text-[#64748B]">{description}</p>
      </div>
      <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function StockControlPage() {
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);

  // KPI — product count
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["stock-kpi-products"],
    queryFn: () =>
      apiFetch<{ meta: { total: number } }>(
        `${API_BASE}/api/catalog/products/?page_size=1&is_archived=false`,
        accessToken,
      ),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  // KPI — low stock count
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ["stock-kpi-low-stock"],
    queryFn: () =>
      apiFetch<{ count: number }>(
        `${API_BASE}/api/catalog/stock/low-stock/?count_only=true`,
        accessToken,
      ),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  // KPI — pending stock takes
  const { data: pendingTakesData, isLoading: pendingLoading } = useQuery({
    queryKey: ["stock-kpi-pending-takes"],
    queryFn: () =>
      apiFetch<{ total: number }>(
        `${API_BASE}/api/catalog/stock-takes/?status=PENDING_APPROVAL`,
        accessToken,
      ),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  // KPI — stock valuation (only if has cost permission)
  const canViewCost = can(PERMISSIONS.PRODUCTS_VIEW_COST);
  const { data: valuationData, isLoading: valuationLoading } = useQuery({
    queryKey: ["stock-kpi-valuation"],
    queryFn: () =>
      apiFetch<{ retail_value: string }>(
        `${API_BASE}/api/catalog/stock/valuation/`,
        accessToken,
      ),
    enabled: !!accessToken && canViewCost,
    staleTime: 300_000,
  });

  // Recent activity
  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-recent-movements"],
    queryFn: () =>
      apiFetch<{ movements: StockMovement[] }>(
        `${API_BASE}/api/catalog/stock/movements/?limit=10`,
        accessToken,
      ),
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  if (!can(PERMISSIONS.STOCK_VIEW)) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <PermissionDenied />
      </main>
    );
  }

  const totalProducts = productsData?.meta?.total ?? 0;
  const lowStockCount = lowStockData?.count ?? 0;
  const pendingCount = pendingTakesData?.total ?? 0;
  const movements = movementsData?.movements ?? [];

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">Stock Control</span>
      </nav>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2B3A]">Stock Control</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Manage inventory levels, track movements, and conduct stock takes.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<PackageIcon className="size-5" />}
          label="Total Products"
          value={totalProducts.toLocaleString()}
          isLoading={productsLoading}
        />
        <KpiCard
          icon={
            <AlertTriangleIcon
              className={cn("size-5", lowStockCount > 0 ? "text-amber-500" : "text-[#64748B]")}
            />
          }
          label="Low Stock Variants"
          value={lowStockCount.toLocaleString()}
          valueClass={lowStockCount > 0 ? "text-amber-500" : "text-[#64748B]"}
          isLoading={lowStockLoading}
        />
        <KpiCard
          icon={<ClipboardListIcon className="size-5 text-blue-500" />}
          label="Pending Stock Takes"
          value={pendingCount.toLocaleString()}
          valueClass="text-blue-500"
          isLoading={pendingLoading}
        />
        <KpiCard
          icon={<BarChart2Icon className="size-5" />}
          label="Total Stock Value"
          isLoading={canViewCost && valuationLoading}
          value={
            !canViewCost ? (
              <span className="flex items-center gap-1 text-base text-[#64748B]">
                <LockIcon className="size-4" /> Restricted
              </span>
            ) : valuationData ? (
              fmtCurrency(valuationData.retail_value)
            ) : (
              "—"
            )
          }
        />
      </div>

      {/* Low-stock alert banner — rendered by LowStockAlertBadge (Task 02.03.06) */}
      {lowStockCount > 0 && (
        <Link
          href="/stock-control/low-stock"
          className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangleIcon className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">
            {lowStockCount} variant{lowStockCount !== 1 ? "s" : ""} low on stock
          </span>
          <ChevronRightIcon className="size-4 shrink-0" />
        </Link>
      )}

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {can(PERMISSIONS.STOCK_ADJUST) && (
          <ActionCard
            href="/stock-control/adjust"
            icon={<PencilIcon className="size-5" />}
            title="Adjust Stock"
            description="Apply a manual quantity change to any variant."
          />
        )}
        {can(PERMISSIONS.STOCK_VIEW) && (
          <ActionCard
            href="/stock-control/movements"
            icon={<ListIcon className="size-5" />}
            title="Movement History"
            description="Browse and export the full audit trail of stock changes."
          />
        )}
        {can(PERMISSIONS.STOCK_TAKE_MANAGE) && (
          <ActionCard
            href="/stock-control/stock-takes"
            icon={<ClipboardCheckIcon className="size-5" />}
            title="Stock Takes"
            description="Start, manage, and review physical inventory counts."
          />
        )}
        {can(PERMISSIONS.PRODUCTS_VIEW_COST) && (
          <ActionCard
            href="/stock-control/valuation"
            icon={<BarChart2Icon className="size-5" />}
            title="Valuation"
            description="View the retail and cost value of current stock by category."
          />
        )}
        {can(PERMISSIONS.STOCK_VIEW) && (
          <ActionCard
            href="/stock-control/low-stock"
            icon={<AlertTriangleIcon className="size-5" />}
            title="Low Stock List"
            description="Review all variants at or below their stock threshold."
          />
        )}
      </div>

      {/* Recent activity */}
      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-[#1B2B3A]">Recent Activity</h2>
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left">
                <th className="px-4 py-3 font-medium text-[#64748B]">Date/Time</th>
                <th className="px-4 py-3 font-medium text-[#64748B]">Product / SKU</th>
                <th className="px-4 py-3 font-medium text-[#64748B]">Reason</th>
                <th className="px-4 py-3 font-medium text-[#64748B]">Delta</th>
                <th className="px-4 py-3 font-medium text-[#64748B]">Actor</th>
              </tr>
            </thead>
            <tbody>
              {movementsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))
                : movements.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                        No stock movements recorded yet.
                      </td>
                    </tr>
                  )
                  : movements.map((m) => (
                    <tr key={m.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-[#64748B]">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1B2B3A]">{m.product_name}</p>
                        <p className="font-mono text-xs text-[#64748B]">{m.variant_sku}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            REASON_STYLES[m.reason] ?? "bg-slate-100 text-slate-500",
                          )}
                        >
                          {REASON_LABELS[m.reason] ?? m.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-semibold",
                            m.quantity_delta > 0 ? "text-green-600" : "text-red-500",
                          )}
                        >
                          {m.quantity_delta > 0 ? "+" : ""}
                          {m.quantity_delta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{m.actor_name ?? "—"}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-right">
          <Link href="/stock-control/movements" className="text-sm font-medium text-[#F97316] hover:underline">
            View All Movements →
          </Link>
        </div>
      </div>
    </main>
  );
}
