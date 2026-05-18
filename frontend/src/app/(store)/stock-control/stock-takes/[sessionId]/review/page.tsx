"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { LockIcon, Loader2Icon, CheckIcon, XIcon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StockTakeSession, StockTakeItem } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: StockTakeSession["status"] }) {
  const styles: Record<string, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    PENDING_APPROVAL: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-slate-100 text-slate-500",
  };
  const labels: Record<string, string> = {
    IN_PROGRESS: "In Progress",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status] ?? status}
    </span>
  );
}

type TabKey = "all" | "discrepancies" | "perfect";

export default function StockTakeReviewPage() {
  const { can, canAny } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { sessionId } = useParams<{ sessionId: string }>();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const hasManage = can(PERMISSIONS.STOCK_TAKE_MANAGE);
  const hasApprove = can(PERMISSIONS.STOCK_TAKE_APPROVE);
  const hasAny = canAny([PERMISSIONS.STOCK_TAKE_MANAGE, PERMISSIONS.STOCK_TAKE_APPROVE]);

  const { data, isLoading } = useQuery({
    queryKey: ["stock-take-review", sessionId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/${sessionId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Session not found");
      const json = await res.json();
      return json.data as { session: StockTakeSession; items: StockTakeItem[] };
    },
    enabled: !!sessionId && !!accessToken && hasAny,
    staleTime: 15_000,
  });

  const { mutate: approve, isPending: approving } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/${sessionId}/approve/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Approval failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock take approved. Inventory levels have been updated.");
      qc.invalidateQueries({ queryKey: ["stock-take-review", sessionId] });
      qc.invalidateQueries({ queryKey: ["stock-takes-list"] });
    },
    onError: () => toast.error("Approval failed. Please try again."),
  });

  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/${sessionId}/reject/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock take rejected.");
      setShowRejectForm(false);
      qc.invalidateQueries({ queryKey: ["stock-take-review", sessionId] });
      qc.invalidateQueries({ queryKey: ["stock-takes-list"] });
    },
    onError: () => toast.error("Rejection failed. Please try again."),
  });

  if (!hasAny) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-[#1B2B3A]">Access Restricted</h2>
          <p className="mt-1 text-sm text-[#64748B]">You don't have permission to view this stock take.</p>
          <Link href="/stock-control/stock-takes" className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline">
            ← Back to Stock Takes
          </Link>
        </div>
      </main>
    );
  }

  const session = data?.session;
  const items = data?.items ?? [];

  const discrepancyItems = items.filter(
    (i) => i.counted_quantity !== null && i.counted_quantity !== i.system_quantity,
  );
  const perfectItems = items.filter(
    (i) => i.counted_quantity !== null && i.counted_quantity === i.system_quantity,
  );

  const netAdditions = discrepancyItems.reduce(
    (acc, i) => acc + Math.max(0, (i.counted_quantity ?? 0) - i.system_quantity),
    0,
  );
  const netReductions = discrepancyItems.reduce(
    (acc, i) => acc + Math.max(0, i.system_quantity - (i.counted_quantity ?? 0)),
    0,
  );

  const tableItems =
    activeTab === "all"
      ? items
      : activeTab === "discrepancies"
        ? discrepancyItems
        : perfectItems;

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <Link href="/stock-control" className="hover:underline">Stock Control</Link>
        <span className="mx-1">›</span>
        <Link href="/stock-control/stock-takes" className="hover:underline">Stock Takes</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">Review</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[#1B2B3A]">Stock Take Review</h1>

      {/* Session metadata card */}
      {isLoading ? (
        <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}><Skeleton className="mb-1 h-3 w-20" /><Skeleton className="h-5 w-28" /></div>
            ))}
          </div>
        </div>
      ) : session && (
        <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-[#64748B]">Status</p>
              <StatusBadge status={session.status} />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Scope</p>
              <p className="font-medium text-[#1B2B3A]">{session.category_name ?? "All Products"}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Initiated By</p>
              <p className="font-medium text-[#1B2B3A]">{session.initiated_by_name}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Started</p>
              <p className="font-medium text-[#1B2B3A]">{fmtDate(session.started_at)}</p>
            </div>
            {session.completed_at && (
              <div>
                <p className="text-xs text-[#64748B]">Submitted</p>
                <p className="font-medium text-[#1B2B3A]">{fmtDate(session.completed_at)}</p>
              </div>
            )}
            {session.approved_at && (
              <div>
                <p className="text-xs text-[#64748B]">
                  {session.status === "APPROVED" ? "Approved" : "Decided"}
                </p>
                <p className="font-medium text-[#1B2B3A]">
                  {fmtDate(session.approved_at)} by {session.approved_by_name ?? "—"}
                </p>
              </div>
            )}
          </div>
          {session.rejection_reason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <span className="font-semibold">Rejection reason: </span>{session.rejection_reason}
            </div>
          )}
        </div>
      )}

      {/* Discrepancy summary */}
      {session && session.status !== "IN_PROGRESS" && (
        <div className={cn(
          "mb-4 rounded-xl border p-5",
          discrepancyItems.length === 0
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-amber-200 bg-amber-50 text-amber-800",
        )}>
          {discrepancyItems.length === 0 ? (
            <p className="font-medium">✓ No discrepancies — all counts match the system exactly.</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              <p className="font-medium">{discrepancyItems.length} discrepanc{discrepancyItems.length !== 1 ? "ies" : "y"} found</p>
              <span>Net Additions: <strong>+{netAdditions}</strong></span>
              <span>Net Reductions: <strong>−{netReductions}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-2 flex gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1 w-fit">
        {([
          { key: "all", label: `All Items (${items.length})` },
          { key: "discrepancies", label: `Discrepancies (${discrepancyItems.length})`, amber: discrepancyItems.length > 0 },
          { key: "perfect", label: `Perfect Matches (${perfectItems.length})` },
        ] as { key: TabKey; label: string; amber?: boolean }[]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-[#1B2B3A] text-white"
                : tab.amber
                  ? "text-amber-600 hover:bg-amber-50"
                  : "text-[#64748B] hover:bg-slate-50",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items table */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left">
              <th className="px-4 py-3 font-medium text-[#64748B]">Variant</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">System Qty</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Counted Qty</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Discrepancy</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Recount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              : tableItems.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                      No items in this view.
                    </td>
                  </tr>
                )
                : tableItems.map((item) => {
                  const discrepancy =
                    item.counted_quantity !== null ? item.counted_quantity - item.system_quantity : null;
                  return (
                    <tr key={item.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1B2B3A]">{item.product_name}</p>
                        <p className="font-mono text-xs text-[#64748B]">{item.variant_sku}</p>
                        <p className="text-xs text-[#64748B]">
                          {[item.variant_size, item.variant_colour].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#1B2B3A]">{item.system_quantity}</td>
                      <td className="px-4 py-3 text-[#1B2B3A]">
                        {item.counted_quantity !== null ? item.counted_quantity : <span className="text-[#64748B]">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {discrepancy !== null ? (
                          <span className={discrepancy === 0 ? "text-[#64748B]" : discrepancy > 0 ? "text-green-600" : "text-red-500"}>
                            {discrepancy > 0 ? "+" : ""}{discrepancy}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.needs_recount && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Recount
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Decision panel (approve permission only) */}
      {hasApprove && session?.status === "PENDING_APPROVAL" && (
        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-[#1B2B3A]">Decision Panel</h2>
          {!showRejectForm ? (
            <div className="flex gap-3">
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={approving || rejecting}
                onClick={() => approve()}
              >
                {approving ? (
                  <><Loader2Icon className="mr-2 size-4 animate-spin" /> Approving…</>
                ) : (
                  <><CheckIcon className="mr-2 size-4" /> Approve Stock Take</>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={approving || rejecting}
                onClick={() => setShowRejectForm(true)}
              >
                <XIcon className="mr-2 size-4" /> Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Reason for Rejection <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="Explain why this stock take is being rejected (minimum 10 characters)…"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
                {rejectionReason.length > 0 && rejectionReason.length < 10 && (
                  <p className="mt-1 text-xs text-red-500">Reason must be at least 10 characters.</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}
                  disabled={rejecting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={rejecting || rejectionReason.length < 10}
                  onClick={() => reject()}
                >
                  {rejecting ? (
                    <><Loader2Icon className="mr-2 size-4 animate-spin" /> Rejecting…</>
                  ) : (
                    "Confirm Rejection"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-only notice for MANAGE-only users */}
      {hasManage && !hasApprove && session?.status === "PENDING_APPROVAL" && (
        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-5 text-sm text-[#64748B]">
          This stock take is pending approval by an authorised manager.
        </div>
      )}
    </main>
  );
}
