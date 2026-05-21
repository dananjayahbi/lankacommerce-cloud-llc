"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, EyeIcon, AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ReturnDetailModal } from "@/components/pos/ReturnDetailModal";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { Return, ReturnRefundMethod, ReturnsListResponse } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Badges ──────────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: ReturnRefundMethod }) {
  const cfg: Record<ReturnRefundMethod, { label: string; cls: string }> = {
    CASH: { label: "Cash", cls: "bg-[#22C55E] text-white" },
    CARD_REVERSAL: { label: "Card Reversal", cls: "bg-[#3B82F6] text-white" },
    STORE_CREDIT: { label: "Store Credit", cls: "bg-[#64748B] text-white" },
    EXCHANGE: { label: "Exchange", cls: "bg-[#F97316] text-white" },
  };
  const { label, cls } = cfg[method];
  return (
    <span className={`rounded-full px-2 py-0.5 font-inter text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function RestockedIcon({ lines }: { lines: Return["lines"] }) {
  if (!lines || lines.length === 0) return <span className="text-[#64748B]">—</span>;
  const allRestocked = lines.every((l) => l.is_restocked);
  const someRestocked = lines.some((l) => l.is_restocked);
  if (allRestocked) return <span className="font-bold text-[#22C55E]">✓</span>;
  if (!someRestocked) return <span className="text-[#64748B]">—</span>;
  // Mixed
  return <AlertTriangleIcon size={14} className="text-[#F59E0B]" />;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Filters {
  dateFrom: string;
  dateTo: string;
  refundMethod: "" | ReturnRefundMethod;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchReturns(
  token: string | null,
  filters: Filters,
  page: number,
): Promise<ReturnsListResponse> {
  if (!token) return { results: [], total: 0, page: 1, limit: PAGE_SIZE };
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (filters.dateFrom) params.set("from_date", filters.dateFrom);
  if (filters.dateTo) params.set("to_date", filters.dateTo);
  if (filters.refundMethod) params.set("refund_method", filters.refundMethod);
  const res = await fetch(`${API_BASE}/api/pos/returns/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const json = (await res.json()) as { success: boolean; data: ReturnsListResponse };
  return json.data;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: "",
    dateTo: "",
    refundMethod: "",
  });
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reset page when filters change
  const prevFilters = useRef(filters);
  useEffect(() => {
    if (prevFilters.current !== filters) {
      setPage(1);
      prevFilters.current = filters;
    }
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ dateFrom: "", dateTo: "", refundMethod: "" });
    setPage(1);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["returns", filters, page],
    queryFn: () => fetchReturns(accessToken, filters, page),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const returns = data?.results ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!can(PERMISSIONS.SALES_VIEW)) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="font-inter text-[14px] text-[#64748B]">
          You don&apos;t have permission to view returns.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Top bar */}
      <div className="border-b border-[#E2E8F0] bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/store/pos/history">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 font-inter text-[13px] text-[#64748B] hover:text-[#1B2B3A]"
            >
              <ChevronLeftIcon size={14} />
              Sales History
            </Button>
          </Link>
          <span className="text-[#E2E8F0]">|</span>
          <h1 className="font-inter text-[16px] font-semibold text-[#1B2B3A]">Return History</h1>
          <span className="rounded-full bg-[#F97316] px-2 py-0.5 font-inter text-[11px] font-medium text-white">
            {total} records
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3">
          <div className="flex items-center gap-2">
            <label className="font-inter text-[12px] text-[#64748B]">From</label>
            <input
              type="datetime-local"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
              className="rounded border border-[#E2E8F0] px-2 py-1 font-inter text-[12px] text-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            />
            {filters.dateFrom && (
              <button
                type="button"
                onClick={() => updateFilter("dateFrom", "")}
                className="font-inter text-[11px] text-[#64748B] hover:text-[#EF4444]"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="font-inter text-[12px] text-[#64748B]">To</label>
            <input
              type="datetime-local"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
              className="rounded border border-[#E2E8F0] px-2 py-1 font-inter text-[12px] text-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            />
            {filters.dateTo && (
              <button
                type="button"
                onClick={() => updateFilter("dateTo", "")}
                className="font-inter text-[11px] text-[#64748B] hover:text-[#EF4444]"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={filters.refundMethod}
            onChange={(e) =>
              updateFilter("refundMethod", e.target.value as Filters["refundMethod"])
            }
            className="rounded border border-[#E2E8F0] px-2 py-1 font-inter text-[12px] text-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
          >
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD_REVERSAL">Card Reversal</option>
            <option value="STORE_CREDIT">Store Credit</option>
            <option value="EXCHANGE">Exchange</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="font-inter text-[12px] text-[#64748B] hover:text-[#1B2B3A]"
          >
            Clear Filters
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F1F5F9]">
                <TableHead className="font-inter text-[12px] font-semibold text-[#64748B]">
                  Return Ref
                </TableHead>
                <TableHead className="font-inter text-[12px] font-semibold text-[#64748B]">
                  Original Sale
                </TableHead>
                <TableHead className="font-inter text-[12px] font-semibold text-[#64748B]">
                  Date
                </TableHead>
                <TableHead className="font-inter text-[12px] font-semibold text-[#64748B]">
                  Items
                </TableHead>
                <TableHead className="text-right font-inter text-[12px] font-semibold text-[#64748B]">
                  Refund Amount
                </TableHead>
                <TableHead className="font-inter text-[12px] font-semibold text-[#64748B]">
                  Method
                </TableHead>
                <TableHead className="font-inter text-[12px] font-semibold text-[#64748B]">
                  Restocked
                </TableHead>
                <TableHead className="font-inter text-[12px] font-semibold text-[#64748B]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && isError && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center font-inter text-[13px] text-[#EF4444]"
                  >
                    Failed to load returns. Please try again.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && returns.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center font-inter text-[13px] text-[#64748B]"
                  >
                    No returns found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                !isError &&
                returns.map((ret) => {
                  const itemCount =
                    ret.lines?.reduce((s, l) => s + l.quantity, 0) ?? 0;
                  return (
                    <TableRow key={ret.id} className="hover:bg-[#F8FAFC]">
                      <TableCell>
                        <span className="font-mono text-[12px] text-[#64748B]">
                          #{shortId(ret.id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="cursor-pointer font-mono text-[12px] text-[#1B2B3A] underline underline-offset-2 hover:text-[#F97316]">
                          #{shortId(ret.original_sale_id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-inter text-[12px] text-[#1B2B3A]">
                          {fmtDate(ret.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-inter text-[12px] text-[#1B2B3A]">
                          {itemCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-[12px] font-semibold text-[#1B2B3A]">
                          {fmtCurrency(ret.refund_amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <MethodBadge method={ret.refund_method} />
                      </TableCell>
                      <TableCell>
                        <RestockedIcon lines={ret.lines ?? []} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 font-inter text-[12px] text-[#64748B] hover:text-[#1B2B3A]"
                          onClick={() => {
                            setSelectedReturn(ret);
                            setDetailOpen(true);
                          }}
                        >
                          <EyeIcon size={13} />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="font-inter text-[12px] text-[#64748B]">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="font-inter text-[12px]"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="font-inter text-[12px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Return Detail Modal */}
      {selectedReturn && (
        <ReturnDetailModal
          returnRecord={selectedReturn}
          open={detailOpen}
          onOpenChange={(o) => {
            setDetailOpen(o);
            if (!o) setSelectedReturn(null);
          }}
        />
      )}
    </div>
  );
}
