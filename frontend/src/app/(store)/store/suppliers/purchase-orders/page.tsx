"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type {
  POStatus,
  PurchaseOrdersListResponse,
  SuppliersListResponse,
} from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-500 text-white" },
  SENT: { label: "Sent", className: "bg-blue-500 text-white" },
  PARTIALLY_RECEIVED: { label: "Partial", className: "bg-amber-500 text-white" },
  RECEIVED: { label: "Received", className: "bg-green-500 text-white" },
  CANCELLED: { label: "Cancelled", className: "bg-red-500 text-white line-through" },
};

function fmtAmount(value: string): string {
  const n = parseFloat(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}

function formatDelivery(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatCreated(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-[#E2E8F0]">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface Filters {
  supplierId: string;
  status: string;
  from_date: string;
  to_date: string;
}

export default function PurchaseOrdersPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>({
    supplierId: "",
    status: "",
    from_date: "",
    to_date: "",
  });
  const [page, setPage] = useState(1);

  const { data: suppliersData } = useQuery<SuppliersListResponse>({
    queryKey: ["suppliers-filter-list"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/suppliers/?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error("Failed to load suppliers");
      return (json as { data: SuppliersListResponse }).data;
    },
    enabled: !!accessToken && can(PERMISSIONS.SUPPLIERS_VIEW),
    staleTime: 60_000,
  });

  function buildQS(): string {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("page_size", String(PAGE_SIZE));
    if (filters.supplierId) p.set("supplier_id", filters.supplierId);
    if (filters.status) p.set("status", filters.status);
    if (filters.from_date) p.set("from_date", filters.from_date);
    if (filters.to_date) p.set("to_date", filters.to_date);
    return p.toString();
  }

  const { data, isLoading, isError } = useQuery<PurchaseOrdersListResponse>({
    queryKey: ["purchase-orders", { ...filters, page }],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/purchase-orders/?${buildQS()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error("Failed to load purchase orders");
      const wrapped = json as { data?: PurchaseOrdersListResponse };
      return wrapped.data ?? (json as PurchaseOrdersListResponse);
    },
    enabled: !!accessToken && can(PERMISSIONS.SUPPLIERS_VIEW),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  if (!can(PERMISSIONS.SUPPLIERS_VIEW)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="font-inter text-sm text-[#64748B]">
          You do not have permission to view purchase orders.
        </p>
      </main>
    );
  }

  const pos = data?.purchase_orders ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-inter text-2xl font-bold text-[#1B2B3A]">Purchase Orders</h1>
          <p className="mt-1 font-inter text-sm text-[#64748B]">
            {data?.total ?? 0} order{(data?.total ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        {can(PERMISSIONS.SUPPLIERS_CREATE) && (
          <Button
            onClick={() => router.push("/store/suppliers/purchase-orders/new")}
            className="bg-[#F97316] font-inter text-white hover:bg-[#EA6C0A]"
          >
            + New Purchase Order
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={filters.supplierId}
          onValueChange={(val) => {
            setFilters((prev) => ({ ...prev, supplierId: val ?? "" }));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-52 border-[#E2E8F0] bg-white font-inter text-sm">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Suppliers</SelectItem>
            {(suppliersData?.results ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(val) => {
            setFilters((prev) => ({ ...prev, status: val ?? "" }));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-48 border-[#E2E8F0] bg-white font-inter text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.from_date}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, from_date: e.target.value }));
            setPage(1);
          }}
          className="h-9 w-40 border-[#E2E8F0] bg-white font-inter text-sm"
          aria-label="From date"
        />

        <Input
          type="date"
          value={filters.to_date}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, to_date: e.target.value }));
            setPage(1);
          }}
          className="h-9 w-40 border-[#E2E8F0] bg-white font-inter text-sm"
          aria-label="To date"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {(
                ["Reference", "Supplier", "Status", "Lines", "Total", "Exp. Delivery", "Created", ""] as const
              ).map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B] last:w-16"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center font-inter text-sm text-[#EF4444]">
                  Failed to load purchase orders.
                </td>
              </tr>
            ) : pos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center font-inter text-sm text-[#64748B]">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              pos.map((po) => {
                const cfg = STATUS_CONFIG[po.status];
                const ref = `PO-${po.id.slice(-8).toUpperCase()}`;
                return (
                  <tr
                    key={po.id}
                    className="border-b border-[#E2E8F0] transition-colors hover:bg-[#F8FAFC]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/store/suppliers/purchase-orders/${po.id}`}
                        className="font-mono text-sm font-semibold text-[#1B2B3A] hover:text-[#F97316]"
                      >
                        {ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-inter text-sm text-[#1B2B3A]">
                      {po.supplier_name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${cfg.className} border-0 text-xs font-semibold`}>
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-inter text-sm text-[#64748B]">
                      {po.lines_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm text-[#1B2B3A]">
                        {fmtAmount(po.total_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-inter text-sm text-[#64748B]">
                      {formatDelivery(po.expected_delivery_date)}
                    </td>
                    <td className="px-4 py-3 font-inter text-sm text-[#64748B]">
                      {formatCreated(po.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/store/suppliers/purchase-orders/${po.id}`)}
                        className="font-inter text-xs text-[#F97316] hover:text-[#EA6C0A]"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between font-inter text-sm text-[#64748B]">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-[#E2E8F0]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-[#E2E8F0]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
