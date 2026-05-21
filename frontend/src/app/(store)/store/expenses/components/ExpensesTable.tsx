"use client";

import Decimal from "decimal.js";
import { ExternalLink } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type Expense, type ExpenseCategory, EXPENSE_CATEGORY_LABELS } from "@/types/expenses";

const EXPENSE_CATEGORY_BADGE_CONFIG: Record<
  ExpenseCategory,
  { bg: string; text: string; border?: string }
> = {
  RENT: { bg: "#F97316", text: "#FFFFFF" },
  SALARIES: { bg: "#1B2B3A", text: "#FFFFFF" },
  UTILITIES: { bg: "#64748B", text: "#FFFFFF" },
  ADVERTISING: { bg: "#E2E8F0", text: "#1B2B3A" },
  MAINTENANCE: { bg: "#F1F5F9", text: "#1B2B3A" },
  MISCELLANEOUS: { bg: "#FFFFFF", text: "#1B2B3A", border: "1px solid #E2E8F0" },
  OTHER: { bg: "#FFFFFF", text: "#1B2B3A", border: "1px solid #E2E8F0" },
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

interface Props {
  expenses: Expense[];
  totalAmount: string;
  onViewDetail: (e: Expense) => void;
}

export function ExpensesTable({ expenses, totalAmount, onViewDetail }: Props) {
  // Per-category sums for current page
  const categoryTotals = expenses.reduce<Record<string, Decimal>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? new Decimal("0")).plus(new Decimal(e.amount));
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center font-inter text-[14px]" style={{ color: "#64748B" }}>
                  No expenses found.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => {
                const badge = EXPENSE_CATEGORY_BADGE_CONFIG[expense.category];
                return (
                  <TableRow key={expense.id}>
                    <TableCell className="font-inter text-[13px]" style={{ color: "#1B2B3A" }}>
                      {formatDate(expense.expense_date)}
                    </TableCell>
                    <TableCell>
                      <span
                        className="rounded-full px-2.5 py-1 font-inter text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.text, border: badge.border }}
                      >
                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-60">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate font-inter text-[13px]" style={{ color: "#1B2B3A" }}>
                              {expense.description.length > 60
                                ? expense.description.slice(0, 60) + "…"
                                : expense.description}
                            </span>
                          </TooltipTrigger>
                          {expense.description.length > 60 && (
                            <TooltipContent>
                              <p className="max-w-xs whitespace-pre-wrap">{expense.description}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[13px]" style={{ color: "#1B2B3A" }}>
                        Rs. {new Decimal(expense.amount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {expense.receipt_image_url ? (
                        <a
                          href={expense.receipt_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-inter text-[12px] underline"
                          style={{ color: "#1B2B3A" }}
                        >
                          <ExternalLink size={12} />
                          View
                        </a>
                      ) : (
                        <span style={{ color: "#64748B" }}>—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-inter text-[13px]" style={{ color: "#64748B" }}>
                      {expense.recorded_by.name}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(expense)}
                        className="font-inter text-[13px]"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {/* Summary footer row */}
            {expenses.length > 0 && (
              <TableRow style={{ background: "#E2E8F0" }}>
                <TableCell colSpan={3} className="font-inter text-[14px] font-medium" style={{ color: "#1B2B3A" }}>
                  Totals for current filter
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[14px] font-bold" style={{ color: "#1B2B3A" }}>
                    Rs. {new Decimal(totalAmount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Per-category chips */}
      {expenses.length > 0 && Object.entries(categoryTotals).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(categoryTotals).map(([cat, total]) => (
            <span
              key={cat}
              className="rounded-full border border-border bg-white px-3 py-1 font-inter text-[12px]"
              style={{ color: "#64748B" }}
            >
              {EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]}: Rs. {total.toFixed(2)}
            </span>
          ))}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="cursor-help rounded-full border border-border bg-white px-2 py-1 font-inter text-[12px]"
                  style={{ color: "#64748B" }}
                >
                  ⓘ
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-[12px]">
                  Per-category amounts shown for the current page only. Use the category filter for accurate totals.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
