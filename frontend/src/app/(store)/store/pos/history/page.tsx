"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeftIcon,
  EyeIcon,
  BanIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleDetailModal } from "@/components/pos/SaleDetailModal";
import { ReturnWizardSheet } from "@/components/pos/ReturnWizardSheet";
import { useAuthStore } from "@/stores/authStore";
import { useShiftContext } from "@/contexts/ShiftContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { SaleListItem, SalesListResponse, SaleStatus, PaymentMethod } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCurrency(value: string) {
  const n = parseFloat(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 16);
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SaleStatus }) {
  const cfg: Record<SaleStatus, { label: string; cls: string }> = {
    COMPLETED: { label: "Completed", cls: "bg-[#22C55E] text-white" },
    VOIDED: { label: "Voided", cls: "bg-[#EF4444] text-white" },
    OPEN: { label: "Held", cls: "bg-[#F59E0B] text-white" },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={`rounded-full px-2 py-0.5 font-inter text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function PaymentBadge({ method }: { method: PaymentMethod | null }) {
  if (!method) return null;
  const styles: Record<PaymentMethod, string> = {
    CASH: "bg-[#22C55E] text-white",
    CARD: "bg-[#3B82F6] text-white",
    SPLIT: "bg-[#F97316] text-white",
    EXCHANGE: "bg-[#8B5CF6] text-white",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 font-inter text-[11px] font-medium ${styles[method]}`}>
      {method}
    </span>
  );
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Filters {
  dateFrom: string;
  dateTo: string;
  status: "" | SaleStatus;
  cashierId: string;
  paymentMethod: "" | PaymentMethod;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaleHistoryPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { shift } = useShiftContext();
  const { can, isManagerOrAbove } = usePermissions();

  const tenantId = user?.tenant_id ?? "";

  const [filters, setFilters] = useState<Filters>({
    dateFrom: todayStart(),
    dateTo: nowIso(),
    status: "",
    cashierId: "",
    paymentMethod: "",
  });
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  const [returnSheetOpen, setReturnSheetOpen] = useState(false);

  // Debounce date inputs
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(filters);

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      const next = { ...filters, [key]: value };
      setFilters(next);

      if (key === "dateFrom" || key === "dateTo") {
        if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current);
        dateDebounceRef.current = setTimeout(() => {
          setDebouncedFilters(next);
          setPage(1);
        }, 300);
      } else {
        setDebouncedFilters(next);
        setPage(1);
      }
    },
    [filters],
  );

  function resetFilters() {
    const defaults: Filters = {
      dateFrom: todayStart(),
      dateTo: nowIso(),
      status: "",
      cashierId: "",
      paymentMethod: "",
    };
    setFilters(defaults);
    setDebouncedFilters(defaults);
    setPage(1);
  }

  function buildQS(): string {
    const p = new URLSearchParams();
    p.set("tenant_id", tenantId);
    p.set("page", String(page));
    p.set("page_size", String(PAGE_SIZE));
    p.set("ordering", sortDir === "desc" ? "-created_at" : "created_at");
    if (debouncedFilters.dateFrom) p.set("date_from", new Date(debouncedFilters.dateFrom).toISOString());
    if (debouncedFilters.dateTo) p.set("date_to", new Date(debouncedFilters.dateTo).toISOString());
    if (debouncedFilters.status) p.set("status", debouncedFilters.status);
    if (debouncedFilters.cashierId) p.set("cashier_id", debouncedFilters.cashierId);
    if (debouncedFilters.paymentMethod) p.set("payment_method", debouncedFilters.paymentMethod);
    return p.toString();
  }

  const { data, isLoading, isError } = useQuery<SalesListResponse>({
    queryKey: ["pos-sales", tenantId, debouncedFilters, page, sortDir],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/pos/sales/?${buildQS()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return (json.data ?? json) as SalesListResponse;
    },
    enabled: !!accessToken && can(PERMISSIONS.SALES_VIEW),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const sales = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openDetail(id: string) {
    setSelectedSaleId(id);
    setDetailOpen(true);
  }

  if (!can(PERMISSIONS.SALES_VIEW)) {
    return (
      <main className="min-h-screen bg-[#F1F5F9] p-6">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
          <p className="font-inter text-[14px] text-[#64748B]">
            You don&apos;t have permission to view sale history.
          </p>
          <Link href="/store/pos" className="mt-3 inline-block font-inter text-[14px] font-medium text-[#F97316] hover:underline">
            ← Back to Terminal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9]">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-[#1B2B3A] px-6 py-3">
        <Link
          href="/store/pos"
          className="flex items-center gap-1.5 font-inter text-[14px] font-medium text-[#F97316] hover:opacity-80"
        >
          <ChevronLeftIcon size={16} />
          Return to Terminal
        </Link>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="font-inter text-[12px] text-[#E2E8F0]">
              {user.email}
            </span>
          )}
          <Link
            href="/store/pos/returns"
            className="rounded-md bg-[#F97316]/10 px-3 py-1.5 font-inter text-[12px] font-medium text-[#F97316] hover:bg-[#F97316]/20"
          >
            Return History →
          </Link>
        </div>
      </div>

      <div className="p-6">
        <h1 className="mb-5 font-inter text-[22px] font-semibold text-[#1B2B3A]">
          Sale History
        </h1>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="font-inter text-[12px] text-[#64748B]">From</label>
            <input
              type="datetime-local"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-inter text-[13px] text-[#1B2B3A] focus:border-[#F97316] focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="font-inter text-[12px] text-[#64748B]">To</label>
            <input
              type="datetime-local"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-inter text-[13px] text-[#1B2B3A] focus:border-[#F97316] focus:outline-none"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="font-inter text-[12px] text-[#64748B]">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value as Filters["status"])}
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-inter text-[13px] text-[#1B2B3A] focus:border-[#F97316] focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="VOIDED">Voided</option>
              <option value="OPEN">Held / Open</option>
            </select>
          </div>

          {/* Payment method */}
          <div className="flex flex-col gap-1">
            <label className="font-inter text-[12px] text-[#64748B]">Payment</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => updateFilter("paymentMethod", e.target.value as Filters["paymentMethod"])}
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-inter text-[13px] text-[#1B2B3A] focus:border-[#F97316] focus:outline-none"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="SPLIT">Split</option>
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="self-end pb-1.5 font-inter text-[13px] text-[#64748B] hover:text-[#1B2B3A] hover:underline"
          >
            Reset Filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          {isError && (
            <div className="p-6 text-center font-inter text-[14px] text-[#EF4444]">
              Failed to load sales. Please try again.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-inter text-[12px] font-medium text-[#64748B]"
                    onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
                  >
                    <span className="flex items-center gap-1">
                      Sale ID
                      {sortDir === "desc" ? (
                        <ChevronDownIcon size={12} />
                      ) : (
                        <ChevronUpIcon size={12} />
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-inter text-[12px] font-medium text-[#64748B]">
                    Date / Time
                  </th>
                  <th className="px-4 py-3 text-left font-inter text-[12px] font-medium text-[#64748B]">
                    Cashier
                  </th>
                  <th className="px-4 py-3 text-center font-inter text-[12px] font-medium text-[#64748B]">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right font-inter text-[12px] font-medium text-[#64748B]">
                    Sub-total
                  </th>
                  <th className="px-4 py-3 text-right font-inter text-[12px] font-medium text-[#64748B]">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-right font-inter text-[12px] font-medium text-[#64748B]">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-inter text-[12px] font-medium text-[#64748B]">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left font-inter text-[12px] font-medium text-[#64748B]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-inter text-[12px] font-medium text-[#64748B]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#E2E8F0]">
                      {Array.from({ length: 10 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-[#E2E8F0]" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!isLoading && sales.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center font-inter text-[14px] text-[#64748B]"
                    >
                      No sales found for the selected filters.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  sales.map((sale: SaleListItem) => {
                    const canVoidSale =
                      can(PERMISSIONS.SALES_VOID) &&
                      sale.status === "COMPLETED" &&
                      sale.shift_id === shift.id;

                    const saleAgeDays =
                      (new Date().getTime() - new Date(sale.created_at).getTime()) /
                      (1000 * 60 * 60 * 24);
                    const canReturn =
                      can(PERMISSIONS.SALES_REFUND) &&
                      sale.status === "COMPLETED" &&
                      saleAgeDays <= 30;

                    return (
                      <tr
                        key={sale.id}
                        className="cursor-pointer border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        onClick={() => openDetail(sale.id)}
                      >
                        {/* Sale ID */}
                        <td className="px-4 py-3" title={sale.id}>
                          <span className="font-mono text-[12px] font-medium text-[#1B2B3A]">
                            {shortId(sale.id)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          <span className="font-inter text-[13px] text-[#1B2B3A]">
                            {fmtDate(sale.created_at)}
                          </span>
                        </td>

                        {/* Cashier */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-inter text-[13px] text-[#1B2B3A]">
                              {sale.cashier_name}
                            </span>
                            {sale.authorizing_manager_id && (
                              <span className="rounded bg-[#FFF7ED] px-1.5 py-0.5 font-inter text-[10px] font-medium text-[#F97316]">
                                Mgr Override
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Items count */}
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 font-inter text-[12px] text-[#64748B]">
                            {sale.line_count}
                          </span>
                        </td>

                        {/* Sub-total */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-[12px] text-[#1B2B3A]">
                            {fmtCurrency(sale.subtotal)}
                          </span>
                        </td>

                        {/* Discount */}
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-mono text-[12px] ${parseFloat(sale.discount_amount) > 0 ? "text-[#EF4444]" : "text-[#64748B]"}`}
                          >
                            {parseFloat(sale.discount_amount) > 0
                              ? fmtCurrency(sale.discount_amount)
                              : "—"}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-[14px] font-bold text-[#1B2B3A]">
                            {fmtCurrency(sale.total_amount)}
                          </span>
                        </td>

                        {/* Payment method */}
                        <td className="px-4 py-3">
                          <PaymentBadge method={sale.payment_method} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={sale.status} />
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openDetail(sale.id)}
                              className="flex items-center gap-1 font-inter text-[12px] text-[#64748B] hover:text-[#1B2B3A]"
                              title="View detail"
                            >
                              <EyeIcon size={14} />
                              View
                            </button>
                            {canVoidSale && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSaleId(sale.id);
                                  setDetailOpen(true);
                                }}
                                className="flex items-center gap-1 font-inter text-[12px] text-[#EF4444] hover:opacity-80"
                                title="Void sale"
                              >
                                <BanIcon size={14} />
                                Void
                              </button>
                            )}
                            {canReturn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReturnSaleId(sale.id);
                                  setReturnSheetOpen(true);
                                }}
                                className="flex items-center gap-1 font-inter text-[12px] text-[#F97316] hover:opacity-80"
                                title="Return items"
                              >
                                <RotateCcwIcon size={14} />
                                Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3">
              <span className="font-inter text-[13px] text-[#64748B]">
                {total} sale{total !== 1 ? "s" : ""} — Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale detail modal */}
      {selectedSaleId && (
        <SaleDetailModal
          saleId={selectedSaleId}
          tenantId={tenantId}
          currentShiftId={shift.id}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedSaleId(null);
          }}
        />
      )}

      {/* Return wizard */}
      {returnSaleId && (
        <ReturnWizardSheet
          saleId={returnSaleId}
          open={returnSheetOpen}
          onOpenChange={(o) => {
            setReturnSheetOpen(o);
            if (!o) setReturnSaleId(null);
          }}
        />
      )}
    </main>
  );
}
