"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductVariant } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { BarcodeLabel } from "./BarcodeLabel";

interface BarcodeLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  variants: Array<ProductVariant & { productName?: string; brandName?: string }>;
}

type PaperSize = "THERMAL" | "A4";

export function BarcodeLabelDialog({ isOpen, onClose, variants }: BarcodeLabelDialogProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>("THERMAL");
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(variants.map((v) => [v.id, 1])),
  );

  const setQty = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.min(99, Math.max(1, qty)) }));
  };

  const totalLabels = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handlePrint = () => {
    // Build flat list of labels
    const labelItems: Array<ProductVariant & { productName?: string; brandName?: string }> = [];
    variants.forEach((v) => {
      for (let i = 0; i < (quantities[v.id] ?? 1); i++) {
        labelItems.push(v);
      }
    });

    // Populate print container
    const container = document.getElementById("barcode-print-container");
    if (!container) return;

    container.innerHTML = "";
    container.style.display = "grid";
    container.style.gridTemplateColumns = paperSize === "THERMAL" ? "1fr" : "repeat(4, 1fr)";
    container.style.gap = "4px";

    // Render labels (simplified: just write HTML — BarcodeLabel rendering in print mode)
    labelItems.forEach((v) => {
      const label = document.createElement("div");
      label.style.width = paperSize === "THERMAL" ? "4cm" : "auto";
      label.style.height = paperSize === "THERMAL" ? "6cm" : "auto";
      label.style.border = "1px solid #E2E8F0";
      label.style.padding = "4px";
      label.style.fontFamily = "Inter, sans-serif";
      label.style.display = "flex";
      label.style.flexDirection = "column";
      label.style.fontSize = "9px";
      label.innerHTML = `
        <div style="font-size:8px;color:#1B2B3A">${v.brandName ?? ""}</div>
        <hr style="border-color:#E2E8F0;margin:2px 0"/>
        <div style="font-size:11px;color:#1B2B3A;font-weight:600">${v.productName ?? ""}</div>
        <div style="font-family:monospace;font-size:9px;color:#1B2B3A">${v.sku}</div>
        <div style="font-size:8px;color:#64748B">Size: ${v.size ?? "—"} · Colour: ${v.colour ?? "—"}</div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:8px;color:#64748B">
          [barcode: ${v.barcode ?? v.sku}]
        </div>
        <div style="font-size:14px;color:#1B2B3A;font-weight:700;text-align:right">
          Rs. ${parseFloat(v.retail_price).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
        </div>
      `;
      container.appendChild(label);
    });

    window.print();
    setTimeout(() => onClose(), 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Barcode Labels</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-6">
          {/* Preview panel */}
          <div className="col-span-3 space-y-3">
            <h3 className="text-sm font-medium text-[var(--color-navy)]">Preview</h3>
            {variants[0] && (
              <BarcodeLabel
                variant={variants[0]}
                productName={(variants[0] as any).productName}
                brandName={(variants[0] as any).brandName}
                paperSize={paperSize}
                isPreview
              />
            )}
          </div>

          {/* Settings panel */}
          <div className="col-span-2 space-y-4">
            {/* Paper size */}
            <div className="space-y-2">
              <Label className="text-sm">Paper Size</Label>
              <div className="space-y-1.5">
                {(["THERMAL", "A4"] as PaperSize[]).map((size) => (
                  <label
                    key={size}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer",
                      paperSize === size ? "border-[var(--color-navy)] bg-[var(--color-navy)]/5" : "border-border",
                    )}
                  >
                    <input
                      type="radio"
                      name="paperSize"
                      value={size}
                      checked={paperSize === size}
                      onChange={() => setPaperSize(size)}
                      className="accent-[var(--color-navy)]"
                    />
                    <div>
                      <span className="text-sm font-medium">
                        {size === "THERMAL" ? "Thermal (4×6 cm)" : "A4 Sheet"}
                      </span>
                      {size === "A4" && (
                        <p className="text-xs text-muted-foreground">32 labels per sheet</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Quantity steppers */}
            <div className="space-y-2">
              <Label className="text-sm">Quantities</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-[var(--color-navy)] truncate">{v.sku}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {v.size} / {v.colour}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQty(v.id, (quantities[v.id] ?? 1) - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border text-sm hover:bg-background"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={quantities[v.id] ?? 1}
                        onChange={(e) => setQty(v.id, parseInt(e.target.value) || 1)}
                        className="h-6 w-10 rounded border border-border text-center text-xs outline-none"
                        min="1"
                        max="99"
                      />
                      <button
                        type="button"
                        onClick={() => setQty(v.id, (quantities[v.id] ?? 1) + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border text-sm hover:bg-background"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Total: {totalLabels} labels</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handlePrint}
            className="bg-[var(--color-navy)] text-white"
          >
            Print Labels
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
