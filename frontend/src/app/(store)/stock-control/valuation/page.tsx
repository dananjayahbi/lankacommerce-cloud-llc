"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { LockIcon, DownloadIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import type { StockValuation } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function fmtCurrency(value: string | number) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 2 }).format(Number(value));
}

function marginClass(pct: number): string {
  if (pct >= 30) return "text-green-600";
  if (pct >= 10) return "text-amber-500";
  return "text-red-500";
}

export default function StockValuationPage() {
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["stock-valuation"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock/valuation/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch valuation");
      const json = await res.json();
      return json.data as StockValuation;
    },
    enabled: !!accessToken && can(PERMISSIONS.PRODUCTS_VIEW_COST),
    staleTime: 120_000,
  });

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/catalog/stock/valuation/?format=csv`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-valuation-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("CSV export failed.");
    } finally {
      setExporting(false);
    }
  }

  if (!can(PERMISSIONS.PRODUCTS_VIEW_COST)) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
          <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-[#1B2B3A]">Cost Data Restricted</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Stock valuation includes cost prices. Access is restricted to authorised roles.
          </p>
          <Link href="/stock-control" className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline">
            ← Back to Stock Control
          </Link>
        </div>
      </main>
    );
  }

  const marginPct = data ? Number(data.estimated_margin_percent) : 0;
  const breakdown = data?.category_breakdown ?? [];
  const totalRetail = Number(data?.retail_value ?? 0);

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <Link href="/stock-control" className="hover:underline">Stock Control</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">Stock Valuation</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B3A]">Stock Valuation</h1>
          {data?.calculated_at && (
            <p className="mt-1 text-sm text-[#64748B]">
              As of {new Date(data.calculated_at).toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["stock-valuation"] })}
            disabled={isLoading}
          >
            <RefreshCwIcon className={cn("mr-2 size-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <><Loader2Icon className="mr-2 size-4 animate-spin" /> Preparing…</>
            ) : (
              <><DownloadIcon className="mr-2 size-4" /> Export CSV</>
            )}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Retail Value",
            value: isLoading ? null : fmtCurrency(data?.retail_value ?? 0),
            sub: null,
            color: "text-[#1B2B3A]",
          },
          {
            label: "Total Cost Value",
            value: isLoading ? null : fmtCurrency(data?.cost_value ?? 0),
            sub: null,
            color: "text-[#1B2B3A]",
          },
          {
            label: "Estimated Gross Margin",
            value: isLoading ? null : `${marginPct.toFixed(1)}%`,
            sub: isLoading ? null : fmtCurrency(data?.estimated_margin ?? 0),
            color: marginClass(marginPct),
          },
          {
            label: "Variants in Stock",
            value: isLoading ? null : (data?.variant_count ?? 0).toLocaleString(),
            sub: null,
            color: "text-[#1B2B3A]",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-sm text-[#64748B]">{card.label}</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-3/4" />
            ) : (
              <>
                <p className={cn("mt-1 text-2xl font-bold font-mono", card.color)}>{card.value}</p>
                {card.sub && <p className="mt-0.5 text-xs text-[#64748B] font-mono">{card.sub}</p>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Category Breakdown Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] px-4 py-3">
          <h2 className="text-base font-semibold text-[#1B2B3A]">Category Breakdown</h2>
        </div>
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left">
              <th className="px-4 py-3 font-medium text-[#64748B]">Category</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Variants</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Retail Value</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Cost Value</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Margin %</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Share of Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              : breakdown.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No data available.</td>
                  </tr>
                )
                : breakdown.map((row) => {
                  const rowRetail = Number(row.retail_value);
                  const rowCost = Number(row.cost_value);
                  const rowMarginPct = rowRetail > 0 ? ((rowRetail - rowCost) / rowRetail) * 100 : 0;
                  const sharePct = totalRetail > 0 ? (rowRetail / totalRetail) * 100 : 0;
                  return (
                    <tr key={row.category_id ?? "uncategorised"} className="border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-[#1B2B3A]">{row.category_name}</td>
                      <td className="px-4 py-3 text-[#64748B]">{row.variant_count.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-[#1B2B3A]">{fmtCurrency(rowRetail)}</td>
                      <td className="px-4 py-3 font-mono text-[#64748B]">{fmtCurrency(rowCost)}</td>
                      <td className={cn("px-4 py-3 font-medium font-mono", marginClass(rowMarginPct))}>
                        {rowMarginPct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#64748B] w-10 shrink-0">{sharePct.toFixed(1)}%</span>
                          <div className="h-1.5 w-24 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#1B2B3A]"
                              style={{ width: `${Math.min(100, sharePct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
