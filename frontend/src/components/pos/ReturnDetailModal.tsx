"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PrinterIcon } from "lucide-react";
import type { Return, ReturnRefundMethod } from "@/types/pos";

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

function fmtCurrency(value: string) {
  const n = parseFloat(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function MethodBadge({ method }: { method: ReturnRefundMethod }) {
  const cfg: Record<ReturnRefundMethod, { label: string; cls: string }> = {
    CASH: { label: "Cash", cls: "bg-[#22C55E] text-white" },
    CARD_REVERSAL: { label: "Card Reversal", cls: "bg-[#3B82F6] text-white" },
    STORE_CREDIT: { label: "Store Credit", cls: "bg-[#64748B] text-white" },
    EXCHANGE: { label: "Exchange", cls: "bg-[#F97316] text-white" },
  };
  const { label, cls } = cfg[method];
  return (
    <span className={`rounded-full px-2 py-0.5 font-inter text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  returnRecord: Return;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReturnDetailModal({ returnRecord: ret, open, onOpenChange }: Props) {
  const allRestocked = ret.lines?.every((l) => l.is_restocked) ?? false;

  function handlePrintReceipt() {
    window.open(`${API_BASE}/api/pos/returns/${ret.id}/receipt/`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[680px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-inter text-[16px] font-semibold text-[#1B2B3A]">
            Return #{shortId(ret.id)}
            <span className="ml-3 font-inter text-[12px] font-normal text-[#64748B]">
              {fmtDate(ret.created_at)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Summary grid */}
        <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div>
            <p className="font-inter text-[11px] text-[#64748B]">Original Sale</p>
            <p className="mt-0.5 font-mono text-[13px] font-semibold text-[#1B2B3A]">
              #{shortId(ret.original_sale_id)}
            </p>
          </div>
          <div>
            <p className="font-inter text-[11px] text-[#64748B]">Refund Method</p>
            <div className="mt-0.5">
              <MethodBadge method={ret.refund_method} />
            </div>
          </div>
          <div>
            <p className="font-inter text-[11px] text-[#64748B]">Refund Amount</p>
            <p className="mt-0.5 font-mono text-[15px] font-bold text-[#1B2B3A]">
              {fmtCurrency(ret.refund_amount)}
            </p>
          </div>
          <div>
            <p className="font-inter text-[11px] text-[#64748B]">Restock Status</p>
            <p className="mt-0.5 font-inter text-[13px] text-[#1B2B3A]">
              {allRestocked ? (
                <span className="text-[#22C55E]">✓ All Restocked</span>
              ) : (
                <span className="text-[#64748B]">Not Restocked</span>
              )}
            </p>
          </div>
          {ret.card_reversal_reference && (
            <div className="col-span-2">
              <p className="font-inter text-[11px] text-[#64748B]">Card Reference</p>
              <p className="mt-0.5 font-mono text-[12px] text-[#1B2B3A]">
                {ret.card_reversal_reference}
              </p>
            </div>
          )}
          {ret.reason && (
            <div className="col-span-2">
              <p className="font-inter text-[11px] text-[#64748B]">Reason</p>
              <p className="mt-0.5 font-inter text-[12px] text-[#1B2B3A]">{ret.reason}</p>
            </div>
          )}
        </div>

        {/* Lines table */}
        <div className="mt-4">
          <p className="mb-2 font-inter text-[13px] font-semibold text-[#1B2B3A]">
            Returned Items
          </p>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F1F5F9]">
                <TableHead className="font-inter text-[11px] text-[#64748B]">Product</TableHead>
                <TableHead className="font-inter text-[11px] text-[#64748B]">Variant</TableHead>
                <TableHead className="text-right font-inter text-[11px] text-[#64748B]">
                  Qty
                </TableHead>
                <TableHead className="text-right font-inter text-[11px] text-[#64748B]">
                  Refund / Line
                </TableHead>
                <TableHead className="font-inter text-[11px] text-[#64748B]">Restocked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ret.lines ?? []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-inter text-[12px] text-[#1B2B3A]">
                    {line.product_name_snapshot}
                  </TableCell>
                  <TableCell className="font-inter text-[12px] text-[#64748B]">
                    {line.variant_description_snapshot || "—"}
                  </TableCell>
                  <TableCell className="text-right font-inter text-[12px] text-[#1B2B3A]">
                    {line.quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[12px] text-[#1B2B3A]">
                    {fmtCurrency(line.line_refund_amount)}
                  </TableCell>
                  <TableCell>
                    {line.is_restocked ? (
                      <span className="font-bold text-[#22C55E]">✓</span>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintReceipt}
            className="gap-1.5 font-inter text-[13px]"
          >
            <PrinterIcon size={13} />
            Print Return Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
