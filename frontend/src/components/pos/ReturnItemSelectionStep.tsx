"use client";


import { AlertTriangleIcon } from "lucide-react";
import type { SaleDetail } from "@/types/pos";

export interface ReturnLineSelection {
  sale_line_id: string;
  quantity: number;
  /** How many are already returned (from prior returns) */
  already_returned: number;
  returnable: number;
  unit_price: string;
  line_refund_amount: string; // computed client-side
  product_name_snapshot: string;
  variant_description_snapshot: string;
  original_quantity: number;
}

interface Props {
  sale: SaleDetail;
  value: ReturnLineSelection[];
  restockItems: boolean;
  onChange: (lines: ReturnLineSelection[], restockItems: boolean) => void;
}

function fmtCurrency(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  const [int, dec] = n.toFixed(2).split(".");
  return `Rs.\u00a0${int!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

export function ReturnItemSelectionStep({ sale, value, restockItems, onChange }: Props) {
  const totalRefund = value.reduce(
    (sum, l) => sum + parseFloat(l.line_refund_amount || "0"),
    0,
  );

  function handleQuantityChange(saleLineId: string, newQty: number) {
    const updated = value.map((line) => {
      if (line.sale_line_id !== saleLineId) return line;
      const clampedQty = Math.max(0, Math.min(newQty, line.returnable));
      const proportional =
        (clampedQty / line.original_quantity) *
        (parseFloat(line.unit_price) * line.original_quantity);
      return {
        ...line,
        quantity: clampedQty,
        line_refund_amount: proportional.toFixed(2),
      };
    });
    onChange(updated, restockItems);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-inter text-[13px] text-[#64748B]">
        Select the items and quantities to return.
      </p>

      {/* Items table */}
      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
              <th className="px-3 py-2 text-left font-inter text-[11px] font-medium text-[#64748B]">
                Product
              </th>
              <th className="px-3 py-2 text-right font-inter text-[11px] font-medium text-[#64748B]">
                Unit Price
              </th>
              <th className="px-3 py-2 text-center font-inter text-[11px] font-medium text-[#64748B]">
                Orig. Qty
              </th>
              <th className="px-3 py-2 text-center font-inter text-[11px] font-medium text-[#64748B]">
                Returned
              </th>
              <th className="px-3 py-2 text-center font-inter text-[11px] font-medium text-[#64748B]">
                Returnable
              </th>
              <th className="px-3 py-2 text-center font-inter text-[11px] font-medium text-[#64748B]">
                Return Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {value.map((line) => (
              <tr key={line.sale_line_id} className="border-b border-[#E2E8F0] last:border-0">
                <td className="px-3 py-2.5">
                  <div className="font-inter text-[13px] font-medium text-[#1B2B3A]">
                    {line.product_name_snapshot}
                  </div>
                  {line.variant_description_snapshot && (
                    <div className="font-inter text-[11px] text-[#64748B]">
                      {line.variant_description_snapshot}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="font-mono text-[12px] text-[#1B2B3A]">
                    {fmtCurrency(line.unit_price)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center font-inter text-[13px] text-[#1B2B3A]">
                  {line.original_quantity}
                </td>
                <td className="px-3 py-2.5 text-center font-inter text-[13px] text-[#64748B]">
                  {line.already_returned}
                </td>
                <td className="px-3 py-2.5 text-center font-inter text-[13px] text-[#1B2B3A]">
                  {line.returnable}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {line.returnable === 0 ? (
                    <span className="font-inter text-[11px] text-[#64748B]">Fully returned</span>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        disabled={line.quantity <= 0}
                        onClick={() => handleQuantityChange(line.sale_line_id, line.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-[#E2E8F0] font-inter text-[14px] text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-7 text-center font-mono text-[13px] font-medium text-[#1B2B3A]">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={line.quantity >= line.returnable}
                        onClick={() => handleQuantityChange(line.sale_line_id, line.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-[#E2E8F0] font-inter text-[14px] text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Refund preview */}
      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div className="flex flex-col gap-1.5">
          {value
            .filter((l) => l.quantity > 0)
            .map((line) => (
              <div key={line.sale_line_id} className="flex justify-between font-inter text-[12px] text-[#64748B]">
                <span>
                  {line.product_name_snapshot} × {line.quantity}
                </span>
                <span className="font-mono">{fmtCurrency(line.line_refund_amount)}</span>
              </div>
            ))}
          {value.some((l) => l.quantity > 0) && (
            <div className="mt-1 flex justify-between border-t border-[#E2E8F0] pt-1.5">
              <span className="font-inter text-[13px] font-semibold text-[#1B2B3A]">Total Refund</span>
              <span className="font-mono text-[15px] font-bold text-[#1B2B3A]">
                {fmtCurrency(totalRefund.toFixed(2))}
              </span>
            </div>
          )}
          {!value.some((l) => l.quantity > 0) && (
            <p className="font-inter text-[12px] text-[#64748B]">
              Select at least one item to return.
            </p>
          )}
        </div>
      </div>

      {/* Restock toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3">
        <input
          type="checkbox"
          id="restock-toggle"
          checked={restockItems}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(value, e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-[#E2E8F0] accent-[#F97316]"
        />
        <label htmlFor="restock-toggle" className="cursor-pointer font-inter text-[13px] text-[#1B2B3A]">
          Restock returned items
        </label>
      </div>

      {!restockItems && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangleIcon size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="font-inter text-[12px] text-amber-700">
            Items will <strong>not</strong> be added back to stock. Only disable this if the
            goods are damaged or non-resaleable.
          </p>
        </div>
      )}
    </div>
  );
}
