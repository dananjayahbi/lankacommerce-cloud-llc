"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon, PrinterIcon, ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────

interface ZReportData {
  shift_id: string;
  shift_status: string;
  cashier_name: string;
  opened_at: string | null;
  closed_at: string | null;
  total_sales_count: number;
  total_sales_amount: string;
  cash_sales_amount: string;
  card_sales_amount: string;
  voided_sales_count: number;
  total_discount_amount: string;
  total_returns_count: number;
  total_refund_amount: string;
  cash_refund_amount: string;
  card_refund_amount: string;
  credit_refund_amount: string;
  exchange_count: number;
  opening_float: string;
  expected_cash_in_drawer: string;
  actual_cash_counted: string | null;
  cash_difference: string | null;
  top_products: Array<{
    product_name_snapshot: string;
    variant_description_snapshot: string;
    total_qty: number;
    total_revenue: string;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────

function fmtCurrency(value: string | null | undefined) {
  if (!value) return "Rs.\u00a00.00";
  const n = parseFloat(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shiftDuration(opened: string | null | undefined, closed: string | null | undefined) {
  if (!opened || !closed) return "—";
  const diffMs = new Date(closed).getTime() - new Date(opened).getTime();
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hours}h ${mins}m`;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────

export default function ShiftClosePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shiftId = searchParams.get("shift_id") ?? "";
  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [cashCount, setCashCount] = useState("");
  const [closeError, setCloseError] = useState("");

  const { data: zReport, isLoading } = useQuery<ZReportData>({
    queryKey: ["z-report", shiftId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/pos/shifts/${shiftId}/z-report/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = (await res.json()) as { success: boolean; data: ZReportData };
      return json.data;
    },
    enabled: !!shiftId && !!accessToken,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const body = {
        closing_cash_count: parseFloat(cashCount) || 0,
      };
      const res = await fetch(`${API_BASE}/api/pos/shifts/${shiftId}/close/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json.error?.message as string) ?? `Error ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Shift closed successfully.");
      void queryClient.invalidateQueries({ queryKey: ["z-report", shiftId] });
      void queryClient.invalidateQueries({ queryKey: ["pos-shift-current"] });
    },
    onError: (err: Error) => {
      setCloseError(err.message);
      toast.error(err.message);
    },
  });

  if (!shiftId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center">
          <p className="font-inter text-[14px] text-[#64748B]">
            No shift ID provided.{" "}
            <Link href="/pos" className="text-[#F97316] hover:underline">
              Return to POS
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-6">
        <Skeleton className="mb-4 h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isOpen = zReport?.shift_status === "OPEN";
  const cashDiff = zReport?.cash_difference ? parseFloat(zReport.cash_difference) : null;
  const cashDiffIsWarning = cashDiff !== null && Math.abs(cashDiff) > 100;

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Header */}
      <div
        className="border-b border-[#E2E8F0] bg-white px-6 py-3 print:hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/pos">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 font-inter text-[13px] text-[#64748B] hover:text-[#1B2B3A]"
              >
                <ChevronLeftIcon size={14} />
                Back to POS
              </Button>
            </Link>
            <h1 className="font-inter text-[16px] font-semibold text-[#1B2B3A]">
              {isOpen ? "Close Shift" : "Z-Report"}
              {zReport && (
                <span className="ml-2 font-mono text-[12px] text-[#64748B]">
                  #{shortId(zReport.shift_id)}
                </span>
              )}
            </h1>
          </div>
          {!isOpen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="gap-1.5 font-inter text-[13px]"
            >
              <PrinterIcon size={13} />
              Print Report
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6">
        {/* Pre-close form (OPEN shift) */}
        {isOpen && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 font-inter text-[15px] font-semibold text-[#1B2B3A]">
              Cash Count Before Close
            </h2>
            {zReport && (
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-[#F8FAFC] p-4 text-sm">
                <div>
                  <p className="font-inter text-[11px] text-[#64748B]">Opening Float</p>
                  <p className="font-mono text-[13px] font-semibold text-[#1B2B3A]">
                    {fmtCurrency(zReport.opening_float)}
                  </p>
                </div>
                <div>
                  <p className="font-inter text-[11px] text-[#64748B]">Expected in Drawer</p>
                  <p className="font-mono text-[13px] font-semibold text-[#1B2B3A]">
                    {fmtCurrency(zReport.expected_cash_in_drawer)}
                  </p>
                </div>
                <div>
                  <p className="font-inter text-[11px] text-[#64748B]">Cash Sales</p>
                  <p className="font-mono text-[13px] text-[#1B2B3A]">
                    {fmtCurrency(zReport.cash_sales_amount)}
                  </p>
                </div>
                <div>
                  <p className="font-inter text-[11px] text-[#64748B]">Cash Refunds</p>
                  <p className="font-mono text-[13px] text-[#1B2B3A]">
                    {fmtCurrency(zReport.cash_refund_amount)}
                  </p>
                </div>
              </div>
            )}
            <label className="mb-1.5 block font-inter text-[12px] text-[#64748B]">
              Actual Cash in Drawer (Rs.)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashCount}
              onChange={(e) => {
                setCashCount(e.target.value);
                setCloseError("");
              }}
              placeholder="0.00"
              className="w-full rounded border border-[#E2E8F0] px-3 py-2 font-mono text-[14px] text-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            />
            {closeError && (
              <p className="mt-1.5 font-inter text-[12px] text-[#EF4444]">{closeError}</p>
            )}
            <Button
              size="sm"
              onClick={() => closeMutation.mutate()}
              disabled={!cashCount || closeMutation.isPending}
              className="mt-4 bg-[#F97316] font-inter text-[13px] text-white hover:bg-[#EA6C0B]"
            >
              {closeMutation.isPending ? "Closing…" : "Close Shift & Generate Z-Report"}
            </Button>
          </div>
        )}

        {/* Z-Report (CLOSED or after close) */}
        {!isOpen && zReport && (
          <div className="space-y-5">
            {/* Section 1: Shift Summary */}
            <Section title="Shift Summary">
              <InfoGrid
                items={[
                  { label: "Shift ID", value: `#${shortId(zReport.shift_id)}`, mono: true },
                  { label: "Cashier", value: zReport.cashier_name },
                  { label: "Opened", value: fmtDate(zReport.opened_at) },
                  { label: "Closed", value: fmtDate(zReport.closed_at) },
                  {
                    label: "Duration",
                    value: shiftDuration(zReport.opened_at, zReport.closed_at),
                  },
                ]}
              />
            </Section>

            {/* Section 2: Sales Summary */}
            <Section title="Sales Summary">
              <SummaryTable
                rows={[
                  { label: "Total Sales", value: zReport.total_sales_count.toString(), mono: false },
                  { label: "Total Sales Amount", value: fmtCurrency(zReport.total_sales_amount) },
                  { label: "Cash Sales", value: fmtCurrency(zReport.cash_sales_amount) },
                  { label: "Card Sales", value: fmtCurrency(zReport.card_sales_amount) },
                  { label: "Voided Sales", value: zReport.voided_sales_count.toString(), mono: false },
                  { label: "Total Discounts Given", value: fmtCurrency(zReport.total_discount_amount) },
                ]}
              />
            </Section>

            {/* Section 3: Returns Summary */}
            <Section title="Returns Summary">
              <SummaryTable
                rows={[
                  { label: "Total Returns", value: zReport.total_returns_count.toString(), mono: false },
                  { label: "Total Refund Amount", value: fmtCurrency(zReport.total_refund_amount) },
                  { label: "Cash Refunds", value: fmtCurrency(zReport.cash_refund_amount) },
                  { label: "Card Reversals", value: fmtCurrency(zReport.card_refund_amount) },
                  { label: "Store Credits Issued", value: fmtCurrency(zReport.credit_refund_amount) },
                  { label: "Exchanges", value: zReport.exchange_count.toString(), mono: false },
                ]}
              />
            </Section>

            {/* Section 4: Net Revenue */}
            <Section title="Net Revenue">
              <div className="rounded-lg border-2 border-[#1B2B3A] bg-[#1B2B3A] p-4 text-white">
                <div className="flex items-baseline justify-between">
                  <span className="font-inter text-[13px]">Net Revenue (Sales − Refunds)</span>
                  <span className="font-mono text-[20px] font-bold">
                    {fmtCurrency(
                      (
                        parseFloat(zReport.total_sales_amount) -
                        parseFloat(zReport.total_refund_amount)
                      )
                        .toFixed(2)
                        .toString()
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-white/20 pt-2">
                  <span className="font-inter text-[11px] text-white/70">
                    Net Cash (Cash Sales − Cash Refunds)
                  </span>
                  <span className="font-mono text-[14px] font-semibold">
                    {fmtCurrency(
                      (
                        parseFloat(zReport.cash_sales_amount) -
                        parseFloat(zReport.cash_refund_amount)
                      )
                        .toFixed(2)
                        .toString()
                    )}
                  </span>
                </div>
              </div>
            </Section>

            {/* Section 5: Cash Reconciliation */}
            <Section title="Cash Reconciliation">
              <SummaryTable
                rows={[
                  { label: "Opening Float", value: fmtCurrency(zReport.opening_float) },
                  { label: "Cash Sales Collected", value: fmtCurrency(zReport.cash_sales_amount) },
                  { label: "Cash Refunds Paid", value: fmtCurrency(zReport.cash_refund_amount) },
                  { label: "Expected in Drawer", value: fmtCurrency(zReport.expected_cash_in_drawer) },
                  {
                    label: "Actual Counted",
                    value: zReport.actual_cash_counted
                      ? fmtCurrency(zReport.actual_cash_counted)
                      : "—",
                    mono: !!zReport.actual_cash_counted,
                  },
                ]}
              />
              {zReport.cash_difference !== null && (
                <div
                  className={`mt-3 flex items-center justify-between rounded-lg border px-4 py-2.5 ${
                    cashDiff !== null && cashDiff >= 0
                      ? "border-[#22C55E] bg-[#F0FDF4]"
                      : "border-[#EF4444] bg-[#FEF2F2]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {cashDiffIsWarning && (
                      <AlertTriangleIcon size={14} className="text-[#F59E0B]" />
                    )}
                    <span className="font-inter text-[12px] text-[#1B2B3A]">Cash Difference</span>
                  </div>
                  <span
                    className={`font-mono text-[14px] font-bold ${
                      cashDiff !== null && cashDiff >= 0
                        ? "text-[#22C55E]"
                        : "text-[#EF4444]"
                    }`}
                  >
                    {cashDiff !== null && cashDiff >= 0 ? "+" : ""}
                    {fmtCurrency(zReport.cash_difference)}
                  </span>
                </div>
              )}
            </Section>

            {/* Section 6: Top Products */}
            {zReport.top_products.length > 0 && (
              <Section title="Top Products Sold">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F1F5F9]">
                      <TableHead className="font-inter text-[11px] text-[#64748B]">Product</TableHead>
                      <TableHead className="font-inter text-[11px] text-[#64748B]">Variant</TableHead>
                      <TableHead className="text-right font-inter text-[11px] text-[#64748B]">
                        Units
                      </TableHead>
                      <TableHead className="text-right font-inter text-[11px] text-[#64748B]">
                        Revenue
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zReport.top_products.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-inter text-[12px] text-[#1B2B3A]">
                          {p.product_name_snapshot}
                        </TableCell>
                        <TableCell className="font-inter text-[12px] text-[#64748B]">
                          {p.variant_description_snapshot || "—"}
                        </TableCell>
                        <TableCell className="text-right font-inter text-[12px] text-[#1B2B3A]">
                          {p.total_qty}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[12px] text-[#1B2B3A]">
                          {fmtCurrency(p.total_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Section>
            )}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5">
        <h3 className="font-inter text-[13px] font-semibold text-[#1B2B3A]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface InfoItem {
  label: string;
  value: string;
  mono?: boolean;
}

function InfoGrid({ items }: { items: InfoItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="font-inter text-[11px] text-[#64748B]">{item.label}</p>
          <p
            className={`mt-0.5 text-[13px] font-semibold text-[#1B2B3A] ${item.mono ? "font-mono" : "font-inter"}`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

interface SummaryRow {
  label: string;
  value: string;
  mono?: boolean;
}

function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="divide-y divide-[#F1F5F9]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between py-2">
          <span className="font-inter text-[12px] text-[#64748B]">{row.label}</span>
          <span
            className={`text-[13px] font-semibold text-[#1B2B3A] ${row.mono === false ? "font-inter" : "font-mono"}`}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
