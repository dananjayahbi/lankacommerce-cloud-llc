"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StaffMember, StaffCommissionDetailResponse } from "@/types/hr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CommissionHistoryProps {
  staffMember: StaffMember;
}

function formatAmount(amountStr: string): string {
  const n = parseFloat(amountStr);
  const abs = Math.abs(n).toFixed(2);
  return n < 0 ? `−Rs. ${abs}` : `Rs. ${abs}`;
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CommissionHistory({ staffMember }: CommissionHistoryProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isError } = useQuery<StaffCommissionDetailResponse>({
    queryKey: ["staff-commissions", staffMember.id, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      const res = await fetch(
        `${API_BASE}/api/hr/staff/${staffMember.id}/commissions/?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch commission history");
      return res.json() as Promise<StaffCommissionDetailResponse>;
    },
  });

  const d = data?.data;
  const pagination = d?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Commission History</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("This feature is coming soon.")}
        >
          Export CSV
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary chips */}
        {d && (
          <div className="flex gap-3 flex-wrap">
            <Badge
              variant="secondary"
              className="font-inter text-[13px] font-normal"
              style={{ background: "#F1F5F9" }}
            >
              Total Earned (All Time): {formatAmount(d.total_earned_all_time)}
            </Badge>
            <Badge
              variant="secondary"
              className="font-inter text-[13px] font-normal"
              style={{ background: "#F1F5F9" }}
            >
              Unpaid Balance: {formatAmount(d.unpaid_total)}
            </Badge>
            <Badge
              variant="secondary"
              className="font-inter text-[13px] font-normal"
              style={{ background: "#F1F5F9" }}
            >
              Unpaid Records: {d.unpaid_count} records
            </Badge>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>Failed to load commission history.</AlertDescription>
          </Alert>
        )}

        {d && d.records.length === 0 && (
          <p className="text-text-muted text-sm">No commission records found.</p>
        )}

        {d && d.records.length > 0 && (
          <>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-navy">Sale Ref</TableHead>
                    <TableHead className="text-navy">Date</TableHead>
                    <TableHead className="text-navy">Base Amount</TableHead>
                    <TableHead className="text-navy">Rate</TableHead>
                    <TableHead className="text-navy">Earned</TableHead>
                    <TableHead className="text-navy">Type</TableHead>
                    <TableHead className="text-navy">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs text-navy">
                        {record.sale_id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {formatDate(record.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-navy">
                        {formatAmount(record.base_amount)}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {record.commission_rate}%
                      </TableCell>
                      <TableCell className="font-mono text-sm text-navy">
                        {formatAmount(record.earned_amount)}
                      </TableCell>
                      <TableCell>
                        {record.is_credit ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ background: "#22C55E" }}
                          >
                            Credit
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ background: "#EF4444" }}
                          >
                            Debit
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.is_paid ? (
                          <span className="text-xs text-text-muted font-medium">Paid</span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ background: "#F97316" }}
                          >
                            Unpaid
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-text-muted">
                Page {pagination?.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
