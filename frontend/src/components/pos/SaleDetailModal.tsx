"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BanIcon, CheckCircleIcon, Loader2Icon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";
import type { SaleDetail, SaleLine, PaymentMethod, SaleStatus } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtAmount(amount: string) {
  return `Rs. ${parseFloat(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function PaymentBadge({ method }: { method: PaymentMethod | null }) {
  if (!method) return null;
  const styles: Record<PaymentMethod, string> = {
    CASH: "bg-[#22C55E] text-white",
    CARD: "bg-[#3B82F6] text-white",
    SPLIT: "bg-[#F97316] text-white",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-inter text-[11px] font-medium", styles[method])}>
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: SaleStatus }) {
  const cfg: Record<SaleStatus, { label: string; cls: string }> = {
    COMPLETED: { label: "Completed", cls: "bg-[#22C55E] text-white" },
    VOIDED: { label: "Voided", cls: "bg-[#EF4444] text-white" },
    OPEN: { label: "Held", cls: "bg-[#F59E0B] text-white" },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-inter text-[11px] font-medium", cls)}>
      {label}
    </span>
  );
}

// ─── Line items table ─────────────────────────────────────────────────────────

function LineItemsTable({ lines }: { lines: SaleLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#E2E8F0]">
            <th className="py-2 pr-4 font-inter text-[11px] font-medium uppercase text-[#64748B]">Product</th>
            <th className="py-2 pr-4 font-inter text-[11px] font-medium uppercase text-[#64748B]">SKU</th>
            <th className="py-2 pr-4 text-right font-inter text-[11px] font-medium uppercase text-[#64748B]">Unit Price</th>
            <th className="py-2 pr-4 text-center font-inter text-[11px] font-medium uppercase text-[#64748B]">Qty</th>
            <th className="py-2 pr-4 text-right font-inter text-[11px] font-medium uppercase text-[#64748B]">Discount</th>
            <th className="py-2 text-right font-inter text-[11px] font-medium uppercase text-[#64748B]">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr
              key={line.id}
              className={idx % 2 === 0 ? "bg-white" : "bg-[#F1F5F9]"}
            >
              <td className="py-2 pr-4">
                <p className="font-inter text-[14px] font-medium text-[#1B2B3A]">
                  {line.product_name_snapshot}
                </p>
                <p className="font-inter text-[12px] text-[#64748B]">
                  {line.variant_description_snapshot}
                </p>
              </td>
              <td className="py-2 pr-4 font-mono text-[11px] text-[#64748B]">
                {line.sku}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-[13px] text-[#1B2B3A]">
                {fmtAmount(line.unit_price)}
              </td>
              <td className="py-2 pr-4 text-center font-inter text-[13px] text-[#1B2B3A]">
                {line.quantity}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-[13px] text-[#EF4444]">
                {parseFloat(line.discount_amount) > 0 ? fmtAmount(line.discount_amount) : "—"}
              </td>
              <td className="py-2 text-right font-mono text-[13px] font-bold text-[#1B2B3A]">
                {fmtAmount(line.line_total_after_discount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Void confirmation dialog ─────────────────────────────────────────────────

interface VoidDialogProps {
  saleId: string;
  shortId: string;
  lineCount: number;
  tenantId: string;
  onSuccess: () => void;
  onClose: () => void;
}

function VoidConfirmDialog({ saleId, shortId: sid, lineCount, tenantId, onSuccess, onClose }: VoidDialogProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoid = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/pos/sales/${saleId}/void/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.detail ?? json.message ?? `HTTP ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["pos-sales"] });
      await queryClient.invalidateQueries({ queryKey: ["pos-sale-detail", saleId] });
      toast.success(`Sale ${sid} has been voided and stock for all line items has been restored.`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Void failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="font-inter text-[18px] font-semibold text-[#1B2B3A]">
          Void Sale {sid}?
        </h3>
        <p className="mt-2 font-inter text-[14px] text-[#64748B]">
          This will permanently reverse the transaction and restore stock for all{" "}
          <strong>{lineCount}</strong> line item{lineCount !== 1 ? "s" : ""}. This action cannot be undone.
        </p>
        <div className="mt-4">
          <label className="mb-1 block font-inter text-[13px] text-[#64748B]">
            Reason for void: <span className="text-[#64748B]">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            rows={2}
            className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3 py-2 font-inter text-[13px] text-[#1B2B3A] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            placeholder="Optional reason for audit log…"
          />
        </div>
        {error && (
          <p className="mt-2 font-inter text-[13px] text-[#EF4444]">{error}</p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-[#EF4444] text-white hover:bg-[#DC2626]"
            onClick={handleVoid}
            disabled={submitting}
          >
            {submitting ? <Loader2Icon size={14} className="mr-2 animate-spin" /> : null}
            Confirm Void
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface SaleDetailModalProps {
  saleId: string;
  tenantId: string;
  currentShiftId?: string | null;
  open: boolean;
  onClose: () => void;
}

async function fetchSaleDetail(saleId: string, token: string | null, tenantId: string): Promise<SaleDetail> {
  const res = await fetch(
    `${API_BASE}/api/pos/sales/${saleId}/?tenant_id=${encodeURIComponent(tenantId)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as SaleDetail;
}

export function SaleDetailModal({
  saleId,
  tenantId,
  currentShiftId,
  open,
  onClose,
}: SaleDetailModalProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  const { data: sale, isLoading, isError } = useQuery<SaleDetail>({
    queryKey: ["pos-sale-detail", saleId, tenantId],
    queryFn: () => fetchSaleDetail(saleId, accessToken, tenantId),
    enabled: open && !!saleId,
    staleTime: 30_000,
  });

  const canVoid =
    can(PERMISSIONS.SALES_VOID) &&
    sale?.status === "COMPLETED" &&
    (currentShiftId == null || sale?.shift_id === currentShiftId);

  // Derived financials
  const lineDiscountTotal = sale?.lines.reduce(
    (acc, l) => acc + parseFloat(l.discount_amount),
    0,
  ) ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-inter text-[18px] font-semibold text-[#1B2B3A]">
                {sale ? `Sale ${shortId(sale.id)}` : "Sale Detail"}
              </DialogTitle>
              {sale && (
                <span className="font-inter text-[13px] text-[#64748B]">
                  {fmtDate(sale.created_at)}
                </span>
              )}
            </div>
          </DialogHeader>

          {isLoading && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {isError && (
            <p className="py-6 text-center font-inter text-[14px] text-[#EF4444]">
              Failed to load sale details. Please try again.
            </p>
          )}

          {sale && (
            <div className="space-y-4">
              {/* Void banner */}
              {sale.status === "VOIDED" && sale.voided_at && (
                <div className="rounded-lg bg-[#EF4444] px-4 py-2 text-white">
                  <p className="font-inter text-[13px]">
                    This sale was voided on{" "}
                    <strong>{fmtDate(sale.voided_at)}</strong>
                    {sale.voided_by_name ? ` by ${sale.voided_by_name}` : ""}.
                  </p>
                </div>
              )}

              {/* Metadata strip */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#F1F5F9] px-4 py-2">
                <span className="font-inter text-[12px] text-[#64748B]">
                  {sale.cashier_name}
                </span>
                <span className="h-3 w-px bg-[#E2E8F0]" />
                <span className="font-mono text-[11px] text-[#64748B]">
                  Shift: {shortId(sale.shift_id)}
                </span>
                <span className="h-3 w-px bg-[#E2E8F0]" />
                <PaymentBadge method={sale.payment_method} />
                <StatusBadge status={sale.status} />
              </div>

              {/* WhatsApp receipt indicator */}
              {sale.whatsapp_receipt_sent_at && (
                <div className="flex items-center gap-1.5">
                  <CheckCircleIcon size={14} className="text-[#22C55E]" />
                  <span className="font-inter text-[12px] text-[#22C55E]">
                    WhatsApp receipt sent
                  </span>
                </div>
              )}

              {/* Line items */}
              <div>
                <h4 className="mb-2 font-inter text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Line Items
                </h4>
                <LineItemsTable lines={sale.lines} />
              </div>

              {/* Financial breakdown */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-inter text-[13px] text-[#64748B]">Sub-total</span>
                    <span className="font-mono text-[13px] text-[#1B2B3A]">
                      {fmtAmount(sale.subtotal)}
                    </span>
                  </div>
                  {lineDiscountTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="font-inter text-[13px] text-[#64748B]">Line Discounts</span>
                      <span className="font-mono text-[13px] text-[#EF4444]">
                        {fmtAmount(lineDiscountTotal.toFixed(2))}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between">
                      <span className="font-inter text-[13px] text-[#64748B]">Cart Discount</span>
                      <span className="font-mono text-[13px] text-[#EF4444]">
                        {fmtAmount(sale.discount_amount)}
                      </span>
                    </div>
                    {sale.authorizing_manager_id && (
                      <p className="font-inter text-[11px] italic text-[#64748B]">
                        Cart discount authorised by{" "}
                        {/* Display manager id truncated; full name lookup omitted for brevity */}
                        {sale.authorizing_manager_id.slice(0, 8).toUpperCase()}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-inter text-[13px] text-[#64748B]">Tax Amount</span>
                    <span className="font-mono text-[13px] text-[#1B2B3A]">
                      {fmtAmount(sale.tax_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#E2E8F0] pt-1.5">
                    <span className="font-inter text-[14px] font-semibold text-[#1B2B3A]">Total</span>
                    <span className="font-mono text-[14px] font-bold text-[#1B2B3A]">
                      {fmtAmount(sale.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Void action */}
              {canVoid && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2]"
                    onClick={() => setShowVoidDialog(true)}
                  >
                    <BanIcon size={14} className="mr-2" />
                    Void Sale
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showVoidDialog && sale && (
        <VoidConfirmDialog
          saleId={sale.id}
          shortId={shortId(sale.id)}
          lineCount={sale.lines.length}
          tenantId={tenantId}
          onSuccess={() => {
            setShowVoidDialog(false);
            onClose();
          }}
          onClose={() => setShowVoidDialog(false)}
        />
      )}
    </>
  );
}
