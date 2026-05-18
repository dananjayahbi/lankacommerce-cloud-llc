"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LockIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LowStockVariant } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  const cls =
    qty === 0
      ? "bg-red-100 text-red-700"
      : qty <= threshold
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";
  const label =
    qty === 0 ? "Out of Stock" : qty <= threshold ? `Low (${qty})` : `OK (${qty})`;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>
      {label}
    </span>
  );
}

function PermissionDenied() {
  return (
    <div className="rounded-xl border border-border bg-white p-8 text-center">
      <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-[#1B2B3A]">Access Restricted</h2>
      <p className="mt-1 text-sm text-[#64748B]">You don't have permission to view low stock data.</p>
      <Link href="/stock-control" className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline">
        ← Back to Stock Control
      </Link>
    </div>
  );
}

export default function LowStockPage() {
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [useCustomThreshold, setUseCustomThreshold] = useState(false);
  const [customThreshold, setCustomThreshold] = useState("5");
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["low-stock-list", useCustomThreshold, customThreshold],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (useCustomThreshold && customThreshold) {
        p.set("threshold_override", customThreshold);
      }
      const res = await fetch(`${API_BASE}/api/catalog/stock/low-stock/?${p.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch low stock variants");
      const json = await res.json();
      return json.data as { variants: LowStockVariant[]; total: number };
    },
    enabled: !!accessToken,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  async function handleExport() {
    setExporting(true);
    try {
      const p = new URLSearchParams({ format: "csv" });
      if (useCustomThreshold && customThreshold) p.set("threshold_override", customThreshold);
      const res = await fetch(`${API_BASE}/api/catalog/stock/low-stock/?${p.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("CSV export failed.");
    } finally {
      setExporting(false);
    }
  }

  if (!can(PERMISSIONS.STOCK_VIEW)) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <PermissionDenied />
      </main>
    );
  }

  const variants = data?.variants ?? [];

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <Link href="/stock-control" className="hover:underline">Stock Control</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">Low Stock List</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B3A]">Low Stock Variants</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Variants at or below their configured low-stock threshold.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="shrink-0"
        >
          {exporting ? (
            <><Loader2Icon className="mr-2 size-4 animate-spin" /> Preparing Export…</>
          ) : (
            <><DownloadIcon className="mr-2 size-4" /> Export to CSV</>
          )}
        </Button>
      </div>

      {/* Custom threshold toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#1B2B3A]">
          <input
            type="checkbox"
            checked={useCustomThreshold}
            onChange={(e) => setUseCustomThreshold(e.target.checked)}
            className="size-4 rounded accent-[#1B2B3A]"
          />
          Use custom threshold override
        </label>
        {useCustomThreshold && (
          <div className="flex items-center gap-2">
            <Label className="text-sm">Threshold</Label>
            <Input
              type="number"
              min="0"
              value={customThreshold}
              onChange={(e) => setCustomThreshold(e.target.value)}
              className="h-8 w-20 text-sm"
            />
          </div>
        )}
        {!useCustomThreshold && (
          <p className="text-xs text-[#64748B]">Using each variant's individual threshold.</p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left">
              <th className="px-4 py-3 font-medium text-[#64748B]">Product</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Variant</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Current Stock</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Threshold</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Shortfall</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              : variants.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#64748B]">
                      {useCustomThreshold
                        ? "No variants below the custom threshold."
                        : "No variants are below their low stock threshold. Inventory is healthy."}
                    </td>
                  </tr>
                )
                : variants.map((v) => (
                  <tr key={v.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1B2B3A]">{v.product_name}</p>
                      <p className="text-xs text-[#64748B]">{v.category_name ?? "Uncategorised"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm text-[#1B2B3A]">{v.sku}</p>
                      <p className="text-xs text-[#64748B]">
                        {[v.size, v.colour].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge qty={v.stock_quantity} threshold={v.low_stock_threshold} />
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{v.low_stock_threshold}</td>
                    <td className="px-4 py-3 font-semibold text-red-500">
                      {v.shortfall > 0 ? `−${v.shortfall}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/stock-control/adjust?variant_id=${v.id}`}
                        className="rounded-md border border-[#1B2B3A] px-2.5 py-1 text-xs font-medium text-[#1B2B3A] hover:bg-[#1B2B3A] hover:text-white transition-colors"
                      >
                        Adjust Stock
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
