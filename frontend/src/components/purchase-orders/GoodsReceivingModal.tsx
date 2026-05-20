"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PurchaseOrder, PurchaseOrderLine } from "@/types/crm";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CostPriceChange {
  variant_id: string;
  variant_description: string;
  old_cost_price: string;
  new_cost_price: string;
}

interface ReceiveResult {
  updated_po: PurchaseOrder;
  cost_prices_changed: CostPriceChange[];
}

interface Props {
  po: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: ReceiveResult) => void;
}

interface LineEntry {
  this_qty: number;
  actual_cost_price: string;
}

// Keep the old props interface exported so existing call-sites still compile
// (they use onSuccess: () => void). The new interface is the canonical one.
export interface GoodsReceivingModalProps extends Props {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function costPriceDiffers(actual: string, expected: string): boolean {
  const a = parseFloat(actual);
  const e = parseFloat(expected);
  if (isNaN(a) || isNaN(e) || e === 0) return false;
  return Math.abs(a - e) / Math.abs(e) > 0.0001;
}

// ---------------------------------------------------------------------------
// Mutation fn
// ---------------------------------------------------------------------------

interface ReceivedLinePayload {
  line_id: string;
  received_qty: number;
  actual_cost_price: number | null;
}

async function receiveGoods(
  poId: string,
  received_lines: ReceivedLinePayload[],
  accessToken: string | null,
): Promise<ReceiveResult> {
  const res = await fetch(
    `${API_BASE}/api/crm/purchase-orders/${poId}/receive/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ received_lines }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    let message = text;
    try {
      const json = JSON.parse(text) as { detail?: string; message?: string };
      message = json.detail ?? json.message ?? text;
    } catch {
      // leave message as raw text
    }
    throw new Error(message);
  }
  const json = (await res.json()) as { data: ReceiveResult };
  return json.data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoodsReceivingModal({
  po,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [entries, setEntries] = React.useState<Record<string, LineEntry>>({});
  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, string>
  >({});

  // Initialise entries whenever po.lines or open changes
  React.useEffect(() => {
    const initial: Record<string, LineEntry> = {};
    for (const line of po.lines) {
      if (!line.is_fully_received) {
        initial[line.id] = {
          this_qty: 0,
          actual_cost_price: line.expected_cost_price.toString(),
        };
      }
    }
    setEntries(initial);
    setValidationErrors({});
  }, [po.lines, open]);

  const displayableLines = po.lines.filter((l) => !l.is_fully_received);

  // Aggregates
  const totalThisQty = Object.values(entries).reduce(
    (sum, e) => sum + e.this_qty,
    0,
  );
  const activeLineCount = Object.values(entries).filter(
    (e) => e.this_qty > 0,
  ).length;

  // ----- entry helpers -----

  const updateQty = React.useCallback(
    (lineId: string, delta: number, remaining: number) => {
      setEntries((prev) => {
        const current = prev[lineId];
        if (!current) return prev;
        const next = Math.min(remaining, Math.max(0, current.this_qty + delta));
        return { ...prev, [lineId]: { ...current, this_qty: next } };
      });
    },
    [],
  );

  const updateCostPrice = React.useCallback(
    (lineId: string, value: string) => {
      setEntries((prev) => {
        const current = prev[lineId];
        if (!current) return prev;
        return { ...prev, [lineId]: { ...current, actual_cost_price: value } };
      });
      // clear validation error on edit
      setValidationErrors((prev) => {
        if (!(lineId in prev)) return prev;
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
    },
    [],
  );

  // ----- mutation -----

  const mutation = useMutation({
    mutationFn: (lines: ReceivedLinePayload[]) =>
      receiveGoods(po.id, lines, accessToken),
    onSuccess: (data) => {
      toast("Goods received successfully.");
      onOpenChange(false);
      onSuccess(data);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ----- submit -----

  const handleConfirm = React.useCallback(() => {
    const errors: Record<string, string> = {};
    const received_lines: ReceivedLinePayload[] = [];

    for (const [lineId, entry] of Object.entries(entries)) {
      if (entry.this_qty <= 0) continue;

      const parsed = parseFloat(entry.actual_cost_price);
      if (isNaN(parsed) || parsed < 0) {
        errors[lineId] = "Enter a valid non-negative cost price.";
        continue;
      }

      const line = po.lines.find((l) => l.id === lineId);
      const expectedParsed = line ? parseFloat(line.expected_cost_price) : NaN;
      const priceChanged =
        !isNaN(expectedParsed) &&
        Math.abs(parsed - expectedParsed) >
          0.0001 * Math.max(Math.abs(expectedParsed), 1);

      received_lines.push({
        line_id: lineId,
        received_qty: entry.this_qty,
        actual_cost_price: priceChanged ? parsed : null,
      });
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    mutation.mutate(received_lines);
  }, [entries, po.lines, mutation]);

  // ----- render -----

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#E2E8F0]">
          <DialogTitle className="text-[#1B2B3A] text-lg font-semibold">
            Receive Goods
          </DialogTitle>
          <DialogDescription className="text-[#64748B]">
            PO-{po.id.slice(-8)} from {po.supplier_name}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        {displayableLines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <p className="text-[#64748B] text-sm">
              All lines for this purchase order have been fully received.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Scrollable table area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="py-2 text-left font-medium text-[#64748B]">
                      Product
                    </th>
                    <th className="py-2 text-right font-medium text-[#64748B] w-20">
                      Ordered
                    </th>
                    <th className="py-2 text-right font-medium text-[#64748B] w-28">
                      Prev Received
                    </th>
                    <th className="py-2 text-right font-medium text-[#64748B] w-24">
                      Remaining
                    </th>
                    <th className="py-2 text-center font-medium text-[#64748B] w-36">
                      This Receiving
                    </th>
                    <th className="py-2 text-left font-medium text-[#64748B] w-48 pl-4">
                      Actual Cost Rs.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayableLines.map((line) => (
                    <GoodsReceivingRow
                      key={line.id}
                      line={line}
                      entry={
                        entries[line.id] ?? {
                          this_qty: 0,
                          actual_cost_price: line.expected_cost_price,
                        }
                      }
                      validationError={validationErrors[line.id]}
                      onUpdateQty={updateQty}
                      onUpdateCostPrice={updateCostPrice}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-4 border-t border-[#E2E8F0] bg-white rounded-b-xl flex-row items-center justify-between gap-4 sm:justify-between">
              <p className="text-sm text-[#64748B]">
                {totalThisQty > 0
                  ? `Receiving ${totalThisQty} item(s) across ${activeLineCount} line(s) this session.`
                  : "Enter quantities to receive."}
              </p>
              <Button
                onClick={handleConfirm}
                disabled={totalThisQty === 0 || mutation.isPending}
                className="bg-[#F97316] hover:bg-[#ea6c10] text-white min-w-[180px]"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Receiving…
                  </>
                ) : (
                  `Confirm Receipt (${totalThisQty} items)`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

interface RowProps {
  line: PurchaseOrderLine;
  entry: LineEntry;
  validationError: string | undefined;
  onUpdateQty: (lineId: string, delta: number, remaining: number) => void;
  onUpdateCostPrice: (lineId: string, value: string) => void;
}

function GoodsReceivingRow({
  line,
  entry,
  validationError,
  onUpdateQty,
  onUpdateCostPrice,
}: RowProps) {
  const remaining = line.ordered_qty - line.received_qty;
  const priceChanged = costPriceDiffers(
    entry.actual_cost_price,
    line.expected_cost_price,
  );

  return (
    <tr className="border-b border-[#E2E8F0] last:border-0 align-top">
      {/* Product */}
      <td className="py-3 pr-4">
        <p className="font-medium text-[#1B2B3A]">
          {line.product_name_snapshot}
        </p>
        <p className="text-xs text-[#64748B]">
          {line.variant_description_snapshot}
        </p>
      </td>

      {/* Ordered */}
      <td className="py-3 text-right text-[#1B2B3A]">{line.ordered_qty}</td>

      {/* Prev Received */}
      <td className="py-3 text-right">
        <span style={{ color: line.received_qty > 0 ? "#22C55E" : "#64748B" }}>
          {line.received_qty}
        </span>
      </td>

      {/* Remaining */}
      <td className="py-3 text-right">
        <span style={{ color: "#F59E0B" }}>{remaining}</span>
      </td>

      {/* This Receiving stepper */}
      <td className="py-3">
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={entry.this_qty <= 0}
            onClick={() => onUpdateQty(line.id, -1, remaining)}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            className="w-16 text-center h-7 px-1"
            value={entry.this_qty}
            min={0}
            max={remaining}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                const clamped = Math.min(remaining, Math.max(0, val));
                onUpdateQty(line.id, clamped - entry.this_qty, remaining);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={entry.this_qty >= remaining}
            onClick={() => onUpdateQty(line.id, 1, remaining)}
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </td>

      {/* Actual Cost */}
      <td className="py-3 pl-4">
        <Input
          type="number"
          step="0.01"
          min="0"
          className="h-7 w-full"
          value={entry.actual_cost_price}
          onChange={(e) => onUpdateCostPrice(line.id, e.target.value)}
        />
        <p className="text-xs text-[#64748B] mt-1">
          Expected: Rs. {line.expected_cost_price}
        </p>
        {priceChanged && (
          <p className="text-xs mt-0.5" style={{ color: "#F59E0B" }}>
            ⚠ Differs from expected
          </p>
        )}
        {validationError !== undefined && (
          <p className="text-xs mt-0.5 text-red-500">{validationError}</p>
        )}
      </td>
    </tr>
  );
}
