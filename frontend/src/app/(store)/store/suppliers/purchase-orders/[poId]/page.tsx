"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GoodsReceivingModal } from "@/components/purchase-orders/GoodsReceivingModal";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { POStatus, PurchaseOrder } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ poId: string }>();
  const poId = params.poId;

  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [costPriceChanges, setCostPriceChanges] = useState<Array<{ variant_id: string; variant_description: string; old_cost_price: string; new_cost_price: string }> | null>(null);

  // ---- Fetch PO ----
  const { data: po, isLoading, isError } = useQuery<PurchaseOrder>({
    queryKey: ["purchase-order", poId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/purchase-orders/${poId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Failed to load PO",
        );
      }
      const wrapped = json as { data?: PurchaseOrder };
      return wrapped.data ?? (json as PurchaseOrder);
    },
    enabled: !!accessToken && !!poId && can(PERMISSIONS.SUPPLIERS_VIEW),
    staleTime: 30_000,
  });

  // ---- Cancel mutation ----
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/purchase-orders/${poId}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Failed to cancel PO",
        );
      }
    },
    onSuccess: () => {
      toast.success("Purchase order cancelled.");
      setCancelOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["purchase-order", poId] });
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Send WhatsApp mutation ----
  const whatsappMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/purchase-orders/${poId}/send-whatsapp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json() as { success: boolean; data?: PurchaseOrder; error?: { message?: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to send");
      return json;
    },
    onSuccess: (data) => {
      const supplierName = data.data?.supplier_name ?? "supplier";
      toast.success(`Purchase Order sent to ${supplierName} via WhatsApp.`);
      void queryClient.invalidateQueries({ queryKey: ["purchase-order", poId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "WhatsApp send failed. Please try again.");
    },
  });

  // ---- Permission guard ----
  if (!can(PERMISSIONS.SUPPLIERS_VIEW)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="font-inter text-sm text-[#64748B]">
          You do not have permission to view purchase orders.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Back link */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/suppliers/purchase-orders")}
          className="font-inter text-sm text-[#64748B]"
        >
          <ArrowLeftIcon className="mr-1.5 h-4 w-4" />
          All Purchase Orders
        </Button>
      </div>

      {isLoading && <DetailSkeleton />}

      {isError && (
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center">
          <p className="font-inter text-sm text-[#EF4444]">Failed to load purchase order.</p>
        </div>
      )}

      {po && (
        <div className="space-y-6">
          {/* ----------------------------------------------------------------
              Header
          ---------------------------------------------------------------- */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {/* PO reference + status + supplier */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-bold text-[#1B2B3A]">
                  PO-{po.id.slice(-8).toUpperCase()}
                </h1>
                <Badge
                  className={`${STATUS_CONFIG[po.status].className} border-0 text-xs font-semibold`}
                >
                  {STATUS_CONFIG[po.status].label}
                </Badge>
                <span className="font-inter text-lg text-[#64748B]">{po.supplier_name}</span>
              </div>

              {/* Supplier contact row */}
              <div className="mt-2 flex flex-wrap gap-4 font-inter text-sm text-[#64748B]">
                {po.supplier_contact_name && (
                  <span>
                    Contact: <span className="text-[#1B2B3A]">{po.supplier_contact_name}</span>
                  </span>
                )}
                {po.supplier_phone && (
                  <span>
                    Phone: <span className="text-[#1B2B3A]">{po.supplier_phone}</span>
                  </span>
                )}
                {po.expected_delivery_date && (
                  <span>
                    Expected:{" "}
                    <span className="text-[#1B2B3A]">{formatDate(po.expected_delivery_date)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {po.status === "DRAFT" && (
                <>
                  <Button
                    onClick={() => whatsappMutation.mutate()}
                    disabled={whatsappMutation.isPending}
                    className="bg-[#F97316] font-inter text-white hover:bg-[#EA6C0A]"
                  >
                    {whatsappMutation.isPending ? "Sending…" : "Send via WhatsApp"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCancelOpen(true)}
                    className="border-[#EF4444] font-inter text-[#EF4444] hover:bg-[#FEE2E2]"
                  >
                    Cancel PO
                  </Button>
                </>
              )}

              {(po.status === "SENT" || po.status === "PARTIALLY_RECEIVED") && (
                <>
                  <Button
                    onClick={() => setReceiveOpen(true)}
                    className="bg-[#1B2B3A] font-inter text-white hover:bg-[#243447]"
                  >
                    Receive Goods
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCancelOpen(true)}
                    className="border-[#EF4444] font-inter text-[#EF4444] hover:bg-[#FEE2E2]"
                  >
                    Cancel PO
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Status banners */}
          {po.status === "RECEIVED" && (
            <div className="flex items-center gap-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              <p className="font-inter text-sm font-medium text-[#15803D]">
                All goods received.
              </p>
            </div>
          )}

          {po.status === "CANCELLED" && (
            <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
              <p className="font-inter text-sm font-medium text-[#64748B]">
                This purchase order was cancelled.
              </p>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Stats row
          ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="border-[#E2E8F0]">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="font-inter text-xs font-medium uppercase tracking-wide text-[#64748B]">
                  Total Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="font-mono text-xl font-bold text-[#1B2B3A]">
                  {fmtAmount(po.total_amount)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0]">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="font-inter text-xs font-medium uppercase tracking-wide text-[#64748B]">
                  Lines
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="font-inter text-xl font-bold text-[#1B2B3A]">{po.lines.length}</p>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0]">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="font-inter text-xs font-medium uppercase tracking-wide text-[#64748B]">
                  Created
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="font-inter text-sm font-semibold text-[#1B2B3A]">
                  {formatDateLong(po.created_at)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0]">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="font-inter text-xs font-medium uppercase tracking-wide text-[#64748B]">
                  Created By
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="font-inter text-sm font-semibold text-[#1B2B3A]">
                  {po.created_by_name}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {po.notes && (
            <Card className="border-[#E2E8F0]">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="font-inter text-xs font-medium uppercase tracking-wide text-[#64748B]">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="whitespace-pre-wrap font-inter text-sm text-[#1B2B3A]">{po.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* ----------------------------------------------------------------
              Lines Table
          ---------------------------------------------------------------- */}
          <Card className="border-[#E2E8F0]">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="font-inter text-base font-semibold text-[#1B2B3A]">
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {(
                        [
                          "Product",
                          "Ordered",
                          "Received",
                          "Fully Rcvd",
                          "Exp. Cost",
                          "Actual Cost",
                        ] as const
                      ).map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {po.lines.map((line) => (
                      <tr
                        key={line.id}
                        className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]"
                      >
                        {/* Product */}
                        <td className="px-4 py-3">
                          <p className="font-inter text-sm font-semibold text-[#1B2B3A]">
                            {line.product_name_snapshot}
                          </p>
                          {line.variant_description_snapshot && (
                            <p className="font-inter text-xs text-[#64748B]">
                              {line.variant_description_snapshot}
                            </p>
                          )}
                        </td>

                        {/* Ordered Qty */}
                        <td className="px-4 py-3 font-inter text-sm text-[#1B2B3A]">
                          {line.ordered_qty}
                        </td>

                        {/* Received Qty */}
                        <td className="px-4 py-3">
                          <span
                            className={`font-inter text-sm font-medium ${
                              line.received_qty > 0 ? "text-[#22C55E]" : "text-[#64748B]"
                            }`}
                          >
                            {line.received_qty} / {line.ordered_qty}
                          </span>
                        </td>

                        {/* Fully Received */}
                        <td className="px-4 py-3">
                          {line.is_fully_received ? (
                            <Badge className="border-0 bg-green-500 text-xs font-semibold text-white">
                              Yes
                            </Badge>
                          ) : (
                            <span className="font-inter text-xs text-[#64748B]">No</span>
                          )}
                        </td>

                        {/* Expected Cost */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-[#1B2B3A]">
                            {fmtAmount(line.expected_cost_price)}
                          </span>
                        </td>

                        {/* Actual Cost */}
                        <td className="px-4 py-3">
                          {line.actual_cost_price ? (
                            <span className="font-mono text-sm text-[#1B2B3A]">
                              {fmtAmount(line.actual_cost_price)}
                            </span>
                          ) : (
                            <span className="font-mono text-sm text-[#64748B]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ----------------------------------------------------------------
          Cancel Confirmation Dialog
      ---------------------------------------------------------------- */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-inter text-base font-semibold text-[#1B2B3A]">
              Cancel Purchase Order
            </DialogTitle>
          </DialogHeader>
          <p className="font-inter text-sm text-[#64748B]">
            Are you sure you want to cancel this purchase order? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              className="border-[#E2E8F0] font-inter"
            >
              Keep It
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="font-inter"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------
          Goods Receiving Modal
      ---------------------------------------------------------------- */}
      {po && (
        <GoodsReceivingModal
          po={po}
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          onSuccess={(result) => {
            void queryClient.invalidateQueries({ queryKey: ["purchase-order", poId] });
            if (result.cost_prices_changed.length > 0) {
              setCostPriceChanges(result.cost_prices_changed);
            }
          }}
        />
      )}

      {/* ----------------------------------------------------------------
          Cost Price Changes AlertDialog
      ---------------------------------------------------------------- */}
      <Dialog open={costPriceChanges !== null} onOpenChange={(open) => { if (!open) setCostPriceChanges(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cost Prices Updated</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#64748B] mb-3">The following variant cost prices were updated during this receiving session:</p>
          <ul className="space-y-2 mb-4">
            {(costPriceChanges ?? []).map((change) => (
              <li key={change.variant_id} className="text-sm">
                <span className="font-medium">{change.variant_description}</span>:{" "}
                <span className="font-mono text-red-500">Rs.&nbsp;{change.old_cost_price}</span>
                {" → "}
                <span className="font-mono text-green-600">Rs.&nbsp;{change.new_cost_price}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#64748B]">These changes affect margin calculations in your sales and reports going forward.</p>
          <DialogFooter>
            <Button onClick={() => setCostPriceChanges(null)} className="bg-[#F97316] hover:bg-[#ea6c0a] text-white">
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
