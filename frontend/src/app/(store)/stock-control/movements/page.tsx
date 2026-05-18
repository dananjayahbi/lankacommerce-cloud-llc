"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { DownloadIcon, LockIcon, Loader2Icon, ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StockMovement } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 25;

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
const ALL_REASONS = Object.keys(REASON_LABELS);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PermissionDenied() {
  return (
    <div className="rounded-xl border border-border bg-white p-8 text-center">
      <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-[#1B2B3A]">Access Restricted</h2>
      <p className="mt-1 text-sm text-[#64748B]">You don't have permission to view stock movements.</p>
      <Link href="/stock-control" className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline">
        ← Back to Stock Control
      </Link>
    </div>
  );
}

type SortDir = "asc" | "desc";

export default function MovementHistoryPage() {
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const searchParams = useSearchParams();

  // filters (URL-synced)
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") ?? "");
  const [selectedReasons, setSelectedReasons] = useState<string[]>(
    searchParams.get("reasons")?.split(",").filter(Boolean) ?? [],
  );
  const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [exporting, setExporting] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const pushParams = useCallback(
    (overrides: Record<string, string>) => {
      const p = new URLSearchParams();
      if (dateFrom) p.set("from", dateFrom);
      if (dateTo) p.set("to", dateTo);
      if (selectedReasons.length) p.set("reasons", selectedReasons.join(","));
      if (searchText) p.set("search", searchText);
      if (page > 1) p.set("page", String(page));
      Object.entries(overrides).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [dateFrom, dateTo, selectedReasons, searchText, page, router],
  );

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSelectedReasons([]);
    setSearchText("");
    setPage(1);
    router.replace("?", { scroll: false });
  }

  // Build query string
  function buildQS(pg: number) {
    const p = new URLSearchParams();
    p.set("page", String(pg));
    p.set("limit", String(PAGE_SIZE));
    p.set("ordering", sortDir === "desc" ? "-created_at" : "created_at");
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    if (selectedReasons.length) p.set("reason", selectedReasons.join(","));
    if (searchText) p.set("search", searchText);
    return p.toString();
  }

  const { data, isLoading } = useQuery({
    queryKey: ["stock-movements", page, sortDir, dateFrom, dateTo, selectedReasons, searchText],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock/movements/?${buildQS(page)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch movements");
      const json = await res.json();
      return json.data as { movements: StockMovement[]; total: number; page: number; limit: number; total_pages: number };
    },
    enabled: !!accessToken,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  async function handleExport() {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      p.set("format", "csv");
      if (dateFrom) p.set("from", dateFrom);
      if (dateTo) p.set("to", dateTo);
      if (selectedReasons.length) p.set("reason", selectedReasons.join(","));
      if (searchText) p.set("search", searchText);
      const res = await fetch(`${API_BASE}/api/catalog/stock/movements/?${p.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movements-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("CSV export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function toggleReason(r: string) {
    setSelectedReasons((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
    setPage(1);
  }

  function handleSortToggle() {
    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    setPage(1);
  }

  if (!can(PERMISSIONS.STOCK_VIEW)) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <PermissionDenied />
      </main>
    );
  }

  const movements = data?.movements ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <Link href="/stock-control" className="hover:underline">Stock Control</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">Movement History</span>
      </nav>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B3A]">Stock Movement History</h1>
          <p className="mt-1 text-sm text-[#64748B]">A complete audit trail of all stock quantity changes.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="shrink-0"
        >
          {exporting ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" /> Preparing Export…
            </>
          ) : (
            <>
              <DownloadIcon className="mr-2 size-4" /> Export to CSV
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-l-4 border-[#E2E8F0] border-l-[#1B2B3A] bg-white p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-36 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-36 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <Label className="text-xs">Product / SKU</Label>
            <Input
              placeholder="Search products or SKUs…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              className="text-sm"
            />
          </div>
        </div>

        {/* Reason chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleReason(r)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                selectedReasons.includes(r)
                  ? "bg-[#1B2B3A] text-white"
                  : "border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-slate-50",
              )}
            >
              {REASON_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-[#F97316] hover:underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Record count */}
      {!isLoading && total > 0 && (
        <p className="mb-2 text-sm text-[#64748B]">
          Showing {start}–{end} of {total.toLocaleString()} movements
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left">
              <th className="px-4 py-3 font-medium text-[#64748B]">
                <button
                  type="button"
                  onClick={handleSortToggle}
                  className="flex items-center gap-1 hover:text-[#1B2B3A]"
                >
                  Date/Time
                  {sortDir === "desc" ? (
                    <ChevronDownIcon className="size-3" />
                  ) : (
                    <ChevronUpIcon className="size-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Product</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Variant</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Reason</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Delta</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Before</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">After</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Actor</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Note</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[100px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : movements.length === 0
                ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">
                      No movements match your current filters.
                    </td>
                  </tr>
                )
                : movements.map((m) => {
                  const isExpanded = expandedNoteId === m.id;
                  const noteText = m.note ?? "";
                  const noteTruncated = noteText.length > 60 ? noteText.slice(0, 60) + "…" : noteText;
                  return (
                    <tr key={m.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1B2B3A]">{m.product_name}</p>
                        <p className="text-xs text-[#64748B]">{m.category_name ?? "Uncategorised"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm text-[#1B2B3A]">{m.variant_sku}</p>
                        <p className="text-xs text-[#64748B]">
                          {[m.variant_size, m.variant_colour].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          REASON_STYLES[m.reason] ?? "bg-slate-100 text-slate-500",
                        )}>
                          {REASON_LABELS[m.reason] ?? m.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        <span className={m.quantity_delta > 0 ? "text-green-600" : "text-red-500"}>
                          {m.quantity_delta > 0 ? "+" : "−"}{Math.abs(m.quantity_delta)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{m.quantity_before}</td>
                      <td className="px-4 py-3">{m.quantity_after}</td>
                      <td className="px-4 py-3 text-[#64748B]">{m.actor_name ?? "—"}</td>
                      <td className="px-4 py-3 text-[#64748B] max-w-[180px]">
                        {noteText ? (
                          <>
                            {isExpanded ? noteText : noteTruncated}
                            {noteText.length > 60 && (
                              <button
                                type="button"
                                onClick={() => setExpandedNoteId(isExpanded ? null : m.id)}
                                className="ml-1 text-xs text-[#F97316] hover:underline"
                              >
                                {isExpanded ? "Less" : "See more"}
                              </button>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-[#64748B]">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}
