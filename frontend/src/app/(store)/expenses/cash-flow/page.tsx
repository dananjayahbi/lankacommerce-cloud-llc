"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { BarChart3, RefreshCw } from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { CashFlowSummary } from "./components/CashFlowSummary";
import { type ExpenseCategory, EXPENSE_CATEGORY_LABELS } from "@/types/expenses";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const EXPENSE_CATEGORY_BADGE_CONFIG: Record<ExpenseCategory, { bg: string; text: string }> = {
  RENT: { bg: "#F97316", text: "#FFFFFF" },
  SALARIES: { bg: "#1B2B3A", text: "#FFFFFF" },
  UTILITIES: { bg: "#64748B", text: "#FFFFFF" },
  ADVERTISING: { bg: "#E2E8F0", text: "#1B2B3A" },
  MAINTENANCE: { bg: "#F1F5F9", text: "#1B2B3A" },
  MISCELLANEOUS: { bg: "#FFFFFF", text: "#1B2B3A" },
  OTHER: { bg: "#FFFFFF", text: "#1B2B3A" },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card / Tap",
  SPLIT: "Split",
};

const CASH_MOVEMENT_LABELS: Record<string, string> = {
  OPENING_FLOAT: "Opening Float",
  PETTY_CASH_OUT: "Petty Cash Out",
  MANUAL_IN: "Manual Cash In",
  MANUAL_OUT: "Manual Cash Out",
};

type CashFlowData = {
  period: { date_from: string; date_to: string };
  income: {
    gross_sales: string;
    total_refunds: string;
    net_income: string;
    payment_breakdown: Record<string, string>;
  };
  expenses: {
    total: string;
    by_category: Array<{ category: string; total: string }>;
  };
  cash_movements: {
    by_type: Record<string, { total: string; count: number }>;
    net_movement: string;
  };
  net_cash_flow: string;
};

// Get first/last day of current month
function getMonthDefaults() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function CashFlowPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isManagerOrAbove } = usePermissions();

  const defaults = getMonthDefaults();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [reportRequested, setReportRequested] = useState(false);

  if (isManagerOrAbove === false) {
    router.replace("/dashboard");
    return null;
  }

  const queryKey = ["cash-flow", dateFrom, dateTo] as const;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const res = await fetch(`${API_BASE}/api/pos/expenses/cash-flow/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json() as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to load report");
      }
      const json = await res.json() as { success: boolean; data: CashFlowData };
      return json.data;
    },
    enabled: reportRequested && !!accessToken && isManagerOrAbove === true,
  });

  const allZero =
    data &&
    new Decimal(data.net_cash_flow).isZero() &&
    new Decimal(data.income.net_income).isZero() &&
    new Decimal(data.expenses.total).isZero();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-inter text-[24px] font-bold" style={{ color: "#1B2B3A" }}>
            Cash Flow Statement
          </h1>
          <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>
            Consolidated income, expense, and cash movement report
          </p>
        </div>
        {data && (
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-1">
            <RefreshCw size={14} />
            Refresh
          </Button>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-4 border-b border-border">
        <a
          href="/expenses"
          className="border-b-2 border-transparent pb-2 font-inter text-[14px] hover:border-border"
          style={{ color: "#64748B" }}
        >
          Expense Log
        </a>
        <span
          className="border-b-2 pb-2 font-inter text-[14px] font-semibold"
          style={{ borderColor: "#F97316", color: "#1B2B3A" }}
        >
          Cash Flow Statement
        </span>
      </div>

      {/* Date range controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-inter text-[13px]" style={{ color: "#64748B" }}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setReportRequested(false); }}
            className="rounded-md border border-border px-3 py-1.5 font-inter text-[13px] focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-inter text-[13px]" style={{ color: "#64748B" }}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setReportRequested(false); }}
            className="rounded-md border border-border px-3 py-1.5 font-inter text-[13px] focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>
        <Button
          onClick={() => setReportRequested(true)}
          disabled={!dateFrom || !dateTo}
          style={{ backgroundColor: "#F97316" }}
          className="font-inter font-semibold text-white"
        >
          Generate Report
        </Button>
      </div>

      {/* Empty / idle state */}
      {!reportRequested && (
        <div className="flex items-center justify-center py-16">
          <Card className="w-full max-w-md p-8 text-center">
            <BarChart3 size={40} className="mx-auto mb-4" style={{ color: "#64748B" }} />
            <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>
              Select a date range and click Generate Report to view your financial summary.
            </p>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {reportRequested && isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-4 w-28" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-40" /></CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Error state */}
      {reportRequested && isError && !isLoading && (
        <Card className="border-red-200 bg-red-50 p-6">
          <p className="font-inter font-semibold" style={{ color: "#EF4444" }}>Report Error</p>
          <p className="mt-1 font-inter text-[14px]" style={{ color: "#64748B" }}>
            An error occurred loading the cash flow report. This may be a temporary issue.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Report content */}
      {data && !isLoading && !isError && (
        <div className="flex flex-col gap-6">
          <CashFlowSummary
            totalIncome={data.income.net_income}
            totalExpenses={data.expenses.total}
            netCashFlow={data.net_cash_flow}
          />

          {allZero ? (
            <Card className="p-8 text-center">
              <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>
                No financial activity recorded for this period. Try a different date range.
              </p>
            </Card>
          ) : (
            <>
              {/* Income Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-inter text-[16px]">Income</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="font-mono text-[20px] font-bold" style={{ color: "#1B2B3A" }}>
                    Net Income: Rs. {new Decimal(data.income.net_income).toFixed(2)}
                  </p>
                  {Object.keys(data.income.payment_breakdown).length > 1 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>Total (Rs.)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(data.income.payment_breakdown).map(([method, total]) => (
                          <TableRow key={method}>
                            <TableCell>{PAYMENT_METHOD_LABELS[method] ?? method}</TableCell>
                            <TableCell className="font-mono">
                              Rs. {new Decimal(total).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : Object.keys(data.income.payment_breakdown).length === 1 ? (
                    <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>
                      All via {PAYMENT_METHOD_LABELS[Object.keys(data.income.payment_breakdown)[0]] ?? Object.keys(data.income.payment_breakdown)[0]}:{" "}
                      Rs. {new Decimal(Object.values(data.income.payment_breakdown)[0]).toFixed(2)}
                    </p>
                  ) : null}
                  <p className="font-inter text-[12px]" style={{ color: "#64748B" }}>
                    Net income = gross sales minus returns for the period. Gross: Rs.{" "}
                    {new Decimal(data.income.gross_sales).toFixed(2)} / Returns: Rs.{" "}
                    {new Decimal(data.income.total_refunds).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-inter text-[16px]">Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.expenses.by_category.length === 0 ? (
                    <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>
                      No expenses recorded for this period.
                    </p>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Total (Rs.)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...data.expenses.by_category]
                            .sort((a, b) => new Decimal(b.total).cmp(new Decimal(a.total)))
                            .map((row) => {
                              const badge = EXPENSE_CATEGORY_BADGE_CONFIG[row.category as ExpenseCategory];
                              return (
                                <TableRow key={row.category}>
                                  <TableCell>
                                    <span
                                      className="rounded-full px-2.5 py-1 font-inter text-[11px] font-semibold"
                                      style={{ background: badge?.bg ?? "#E2E8F0", color: badge?.text ?? "#1B2B3A" }}
                                    >
                                      {EXPENSE_CATEGORY_LABELS[row.category as ExpenseCategory] ?? row.category}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-mono">
                                    Rs. {new Decimal(row.total).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          <TableRow className="font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="font-mono">
                              Rs. {new Decimal(data.expenses.total).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>

                      {/* Progress bars */}
                      <div className="space-y-2">
                        {data.expenses.by_category
                          .filter((row) => new Decimal(row.total).gt(0))
                          .sort((a, b) => new Decimal(b.total).cmp(new Decimal(a.total)))
                          .map((row) => {
                            const totalD = new Decimal(data.expenses.total);
                            const pct = totalD.gt(0)
                              ? new Decimal(row.total).div(totalD).mul(100).toNumber()
                              : 0;
                            const badge = EXPENSE_CATEGORY_BADGE_CONFIG[row.category as ExpenseCategory];
                            return (
                              <div key={row.category} className="flex items-center gap-3">
                                <span className="w-28 shrink-0 font-inter text-[12px]" style={{ color: "#64748B" }}>
                                  {EXPENSE_CATEGORY_LABELS[row.category as ExpenseCategory] ?? row.category}
                                </span>
                                <Progress
                                  value={pct}
                                  className="flex-1"
                                  style={{ "--progress-foreground": badge?.bg ?? "#64748B" } as React.CSSProperties}
                                />
                                <span className="w-24 shrink-0 text-right font-mono text-[12px]" style={{ color: "#1B2B3A" }}>
                                  Rs. {new Decimal(row.total).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Cash Movement Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-inter text-[16px]">Cash Movement Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(data.cash_movements.by_type).length === 0 ? (
                    <p className="font-inter text-[14px]" style={{ color: "#64748B" }}>
                      No cash movements recorded for this period.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Movement Type</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(data.cash_movements.by_type).map(([type, info]) => {
                          const color =
                            type === "MANUAL_IN" ? "#22C55E"
                              : type === "OPENING_FLOAT" ? "#1B2B3A"
                              : "#EF4444";
                          return (
                            <TableRow key={type}>
                              <TableCell className="font-inter text-[13px]">
                                {CASH_MOVEMENT_LABELS[type] ?? type}
                              </TableCell>
                              <TableCell className="font-inter text-[13px]">{info.count}</TableCell>
                              <TableCell className="font-mono text-[13px]" style={{ color }}>
                                Rs. {new Decimal(info.total).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Net movement row */}
                        <TableRow className="font-bold">
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help underline decoration-dotted">Net Movement</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Opening float + manual inflows minus petty cash and manual outflows.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell />
                          <TableCell
                            className="font-mono text-[13px]"
                            style={{
                              color: new Decimal(data.cash_movements.net_movement).isNegative()
                                ? "#EF4444"
                                : new Decimal(data.cash_movements.net_movement).isZero()
                                ? "#1B2B3A"
                                : "#22C55E",
                            }}
                          >
                            Rs. {new Decimal(data.cash_movements.net_movement).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
