"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, Upload } from "lucide-react";
import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSheet } from "@/components/customers/CustomerSheet";
import { ImportCustomersSheet } from "@/components/customers/ImportCustomersSheet";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { Customer, CustomersListResponse } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 20;

type TagFilter = "" | "VIP" | "Regular" | "Wholesale" | "Staff" | "Online";
type SpendBand = "" | "under5k" | "5k25k" | "25kplus";

interface Filters {
  search: string;
  tag: TagFilter;
  spendBand: SpendBand;
}

function fmtCurrency(value: string) {
  const n = parseFloat(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}

function CreditBalanceCell({ value }: { value: string }) {
  const d = new Decimal(value);
  if (d.gt(0)) {
    return <span className="font-medium text-[#22C55E]">{fmtCurrency(value)}</span>;
  }
  if (d.lt(0)) {
    return <span className="font-medium text-[#EF4444]">{fmtCurrency(value)}</span>;
  }
  return <span className="text-[#64748B]">{fmtCurrency(value)}</span>;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-[#E2E8F0]">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function CustomersPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<Filters>({ search: "", tag: "", spendBand: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(1);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);

  const updateSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  function buildQS(): string {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("page_size", String(PAGE_SIZE));
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (filters.tag) p.set("tag", filters.tag);
    if (filters.spendBand === "under5k") {
      p.set("spend_max", "4999");
    } else if (filters.spendBand === "5k25k") {
      p.set("spend_min", "5000");
      p.set("spend_max", "25000");
    } else if (filters.spendBand === "25kplus") {
      p.set("spend_min", "25000");
    }
    return p.toString();
  }

  const { data, isLoading, isError } = useQuery<CustomersListResponse>({
    queryKey: ["customers", { search: debouncedSearch, tag: filters.tag, spendBand: filters.spendBand, page }],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/customers/?${buildQS()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return (json.data ?? json) as CustomersListResponse;
    },
    enabled: !!accessToken && can(PERMISSIONS.CUSTOMERS_VIEW),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.total_pages ?? 1;

  function openCreate() {
    setEditCustomer(undefined);
    setSheetOpen(true);
  }

  function openEdit(c: Customer) {
    setEditCustomer(c);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    void queryClient.invalidateQueries({ queryKey: ["customers"] });
    setSheetOpen(false);
  }

  if (!can(PERMISSIONS.CUSTOMERS_VIEW)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="font-inter text-[#64748B]">
          You do not have permission to view customers.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-inter text-2xl font-bold text-[#1B2B3A]">Customers</h1>
          <p className="mt-1 font-inter text-sm text-[#64748B]">
            Manage your customer database
          </p>
        </div>
        {can(PERMISSIONS.CUSTOMERS_CREATE) && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button
              onClick={openCreate}
              className="bg-[#F97316] font-inter text-white hover:bg-[#EA6C0A]"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or phone…"
          value={filters.search}
          onChange={(e) => updateSearch(e.target.value)}
          className="h-9 w-64 border-[#E2E8F0] bg-white font-inter text-sm"
        />

        <Select
          value={filters.tag}
          onValueChange={(val) => {
            setFilters((prev) => ({ ...prev, tag: val as TagFilter }));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-36 border-[#E2E8F0] bg-white font-inter text-sm">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Tags</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Wholesale">Wholesale</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
            <SelectItem value="Online">Online</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.spendBand}
          onValueChange={(val) => {
            setFilters((prev) => ({ ...prev, spendBand: val as SpendBand }));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-40 border-[#E2E8F0] bg-white font-inter text-sm">
            <SelectValue placeholder="Any Spend" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any Spend</SelectItem>
            <SelectItem value="under5k">Under Rs. 5,000</SelectItem>
            <SelectItem value="5k25k">Rs. 5,000 – 25,000</SelectItem>
            <SelectItem value="25kplus">Rs. 25,000+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {isError && (
        <div className="mb-4 rounded-md border border-[#EF4444] bg-red-50 px-4 py-3 font-inter text-sm text-[#EF4444]">
          Failed to load customers. Please try again.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-4 py-3 text-left font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Name
              </th>
              <th className="px-4 py-3 text-left font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Phone
              </th>
              <th className="px-4 py-3 text-left font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Tags
              </th>
              <th className="px-4 py-3 text-right font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Credit Balance
              </th>
              <th className="px-4 py-3 text-right font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Total Spend
              </th>
              <th className="px-4 py-3 text-center font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-inter text-sm text-[#64748B]">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#E2E8F0] transition-colors hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-inter text-sm font-medium text-[#1B2B3A] underline-offset-2 hover:text-[#F97316] hover:underline"
                    >
                      {c.name}
                    </Link>
                    {!c.is_active && (
                      <span className="ml-2 rounded-full bg-[#F1F5F9] px-1.5 py-0.5 font-inter text-[10px] text-[#64748B]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-inter text-sm text-[#1B2B3A]">{c.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="bg-[#FFF7ED] font-inter text-[11px] font-medium text-[#F97316] hover:bg-[#FFF7ED]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-inter text-sm">
                    <CreditBalanceCell value={c.credit_balance} />
                  </td>
                  <td className="px-4 py-3 text-right font-inter text-sm text-[#1B2B3A]">
                    {fmtCurrency(c.total_spend)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {can(PERMISSIONS.CUSTOMERS_EDIT) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        className="h-7 px-2 font-inter text-xs text-[#64748B] hover:text-[#1B2B3A]"
                      >
                        <PencilIcon className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="font-inter text-sm text-[#64748B]">
            Page {page} of {totalPages}
            {data ? ` · ${data.total} total` : ""}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 border-[#E2E8F0] font-inter text-sm"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 border-[#E2E8F0] font-inter text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Customer Sheet */}
      <CustomerSheet
        {...(editCustomer !== undefined ? { customer: editCustomer } : {})}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleSheetSuccess}
      />

      {/* Import Sheet */}
      <ImportCustomersSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => {
          setImportOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["customers"] });
        }}
      />
    </main>
  );
}
