"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";

import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { type Expense, type ExpenseCategory, EXPENSE_CATEGORY_LABELS } from "@/types/expenses";
import { ExpensesTable } from "./components/ExpensesTable";
import { CreateExpenseModal } from "./components/CreateExpenseModal";
import { ExpenseDetailSheet } from "./components/ExpenseDetailSheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function ExpensesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isManagerOrAbove } = usePermissions();

  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);

  useEffect(() => {
    if (isManagerOrAbove === false) {
      router.replace("/dashboard");
    }
  }, [isManagerOrAbove, router]);

  const hasFilters = category !== "all" || dateFrom !== "" || dateTo !== "";

  const queryKey = ["expenses", category, dateFrom, dateTo, page] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (category !== "all") params.set("category", category);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`${API_BASE}/api/pos/expenses/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const json = await res.json() as { success: boolean; data: { expenses: Expense[]; pagination: { page: number; page_size: number; total_count: number; total_pages: number }; total_amount: string } };
      return json.data;
    },
    enabled: !!accessToken && isManagerOrAbove === true,
    placeholderData: (prev) => prev,
  });

  if (isManagerOrAbove === false) return null;

  const clearFilters = () => {
    setCategory("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const totalAmount = data?.total_amount ?? "0";
  const showTotalBadge = new Decimal(totalAmount).gt(0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-inter text-[24px] font-bold" style={{ color: "#1B2B3A" }}>
            Expense Log
          </h1>
          <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>
            Track and manage business expenses
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          style={{ backgroundColor: "#F97316" }}
          className="font-inter font-semibold text-white"
        >
          + New Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
              <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <label className="font-inter text-[13px]" style={{ color: "#64748B" }}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-md border border-border px-3 py-1.5 font-inter text-[13px] focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-inter text-[13px]" style={{ color: "#64748B" }}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-md border border-border px-3 py-1.5 font-inter text-[13px] focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="font-inter text-[13px] underline"
            style={{ color: "#64748B" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Summary bar */}
      {showTotalBadge && (
        <div
          className="inline-flex w-fit items-center rounded-lg px-4 py-2"
          style={{ background: "#E2E8F0" }}
        >
          <span className="font-inter text-[14px]" style={{ color: "#1B2B3A" }}>
            Total for filters:{" "}
            <span className="font-semibold font-mono">
              Rs. {new Decimal(totalAmount).toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>Loading expenses…</p>
        </div>
      ) : (
        <>
          <ExpensesTable
            expenses={data?.expenses ?? []}
            totalAmount={totalAmount}
            onViewDetail={setDetailExpense}
          />
          {/* Pagination */}
          {data && data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="font-inter text-[13px]" style={{ color: "#64748B" }}>
                Page {data.pagination.page} of {data.pagination.total_pages} ({data.pagination.total_count} records)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateExpenseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {}}
        queryKey={["expenses", category, dateFrom, dateTo, page]}
      />

      <ExpenseDetailSheet
        expense={detailExpense}
        onClose={() => setDetailExpense(null)}
        queryKey={["expenses", category, dateFrom, dateTo, page]}
      />
    </div>
  );
}
