"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ROLE_BADGE_CONFIG } from "../../components/StaffTable";
import type { CommissionSummaryItem } from "@/types/hr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CommissionTableProps {
  summary: CommissionSummaryItem[];
  periodStart: string;
  periodEnd: string;
}

function formatAmount(amountStr: string): string {
  const n = parseFloat(amountStr);
  return `Rs. ${n.toFixed(2)}`;
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CommissionTable({ summary, periodStart, periodEnd }: CommissionTableProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isManagerOrAbove } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState<CommissionSummaryItem | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);

  const payoutMutation = useMutation({
    mutationFn: async (item: CommissionSummaryItem) => {
      const res = await fetch(`${API_BASE}/api/hr/commissions/payout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: item.user_id,
          period_start: periodStart,
          period_end: periodEnd,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: (_, item) => {
      setPayoutDialogOpen(false);
      setSelectedStaff(null);
      toast.success(`Commission payout recorded for ${item.user_name}.`);
      void queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (err: unknown) => {
      setPayoutDialogOpen(false);
      setSelectedStaff(null);
      const code = (err as { error?: { code?: string } })?.error?.code;
      if (code === "NO_UNPAID_RECORDS") {
        toast.error("No unpaid records found. The period may have already been paid.");
      } else {
        toast.error("Payout failed. Please try again.");
      }
    },
  });

  if (summary.length === 0) {
    return (
      <p className="text-text-muted text-sm">No commission data for the selected period.</p>
    );
  }

  return (
    <>
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background">
              <TableHead className="text-navy">Staff Name</TableHead>
              <TableHead className="text-navy">Role</TableHead>
              <TableHead className="text-navy">Total Earned</TableHead>
              <TableHead className="text-navy">Unpaid Amount</TableHead>
              <TableHead className="text-navy">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((item) => {
              const badgeCfg = ROLE_BADGE_CONFIG[item.user_role];
              const unpaidNum = parseFloat(item.unpaid_total);
              return (
                <TableRow key={item.user_id}>
                  <TableCell className="font-medium text-navy">{item.user_name}</TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: badgeCfg.background, color: badgeCfg.color }}
                    >
                      {badgeCfg.label}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-navy">
                    {formatAmount(item.total_earned)}
                  </TableCell>
                  <TableCell>
                    {unpaidNum > 0 ? (
                      <span
                        className="font-mono text-sm px-2 py-0.5 rounded"
                        style={{ color: "#F97316", background: "#F1F5F9" }}
                      >
                        {formatAmount(item.unpaid_total)}
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-text-muted">Rs. 0.00</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isManagerOrAbove && item.unpaid_count > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStaff(item);
                          setPayoutDialogOpen(true);
                        }}
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Commission Payout</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStaff && (
                <>
                  You are about to mark{" "}
                  <strong>{selectedStaff.unpaid_count}</strong> commission records as paid for{" "}
                  <strong>{selectedStaff.user_name}</strong> for the period{" "}
                  {formatDate(periodStart)} to {formatDate(periodEnd)}.{" "}
                  Total payout: <strong>{formatAmount(selectedStaff.unpaid_total)}</strong>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPayoutDialogOpen(false);
                setSelectedStaff(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedStaff) payoutMutation.mutate(selectedStaff);
              }}
              disabled={payoutMutation.isPending}
            >
              {payoutMutation.isPending ? "Processing..." : "Confirm Payout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
