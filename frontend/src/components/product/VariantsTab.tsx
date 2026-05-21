"use client";

import { useState } from "react";
import { ChevronRightIcon, ChevronDownIcon, PencilIcon, TrashIcon, PrinterIcon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product, ProductVariant } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { VariantEditSheet } from "./VariantEditSheet";
import { BarcodeLabelDialog } from "@/components/inventory/BarcodeLabelDialog";

interface VariantsTabProps {
  product: Product;
}

interface ConfirmDeleteDialogProps {
  variantSku: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDeleteDialog({ variantSku, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h3 className="font-semibold text-[var(--color-navy)]">Delete Variant</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Delete variant <span className="font-mono font-medium">{variantSku}</span>? This cannot be undone from the UI.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">Delete</Button>
        </div>
      </div>
    </div>
  );
}

export function VariantsTab({ product }: VariantsTabProps) {
  const { can } = usePermissions();
  const canViewCost = can(PERMISSIONS.PRODUCTS_VIEW_COST);
  const canDelete = can(PERMISSIONS.PRODUCTS_DELETE);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);
  const [deleteVariant, setDeleteVariant] = useState<ProductVariant | null>(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);

  const toggleExpand = (variantId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteVariant) return;
    // TODO: call DELETE /api/catalog/variants/{id}/
    setDeleteVariant(null);
  };

  const variants = product.variants ?? [];

  const stockBadgeClass = (stock: number, threshold: number) => {
    if (stock === 0) return "bg-destructive/15 text-destructive border-destructive/20";
    if (stock <= threshold) return "bg-warning/15 text-warning border-warning/20";
    return "bg-success/15 text-success border-success/20";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLabelDialog(true)}
        >
          <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
          Print Labels
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-xs font-semibold text-[var(--color-navy)]">
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3 text-left">SKU</th>
              <th className="px-3 py-3 text-left">Barcode</th>
              <th className="px-3 py-3 text-left">Size</th>
              <th className="px-3 py-3 text-left">Colour</th>
              {canViewCost && <th className="px-3 py-3 text-right">Cost</th>}
              <th className="px-3 py-3 text-right">Retail</th>
              <th className="px-3 py-3 text-right">Wholesale</th>
              <th className="px-3 py-3 text-right">Stock</th>
              <th className="px-3 py-3 text-right">Threshold</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => {
              const isExpanded = expandedRows.has(variant.id);
              const stock = variant.stock_quantity ?? 0;
              const threshold = variant.low_stock_threshold ?? 5;
              const images = (variant as any).image_urls ?? [];

              return (
                <>
                  <tr
                    key={variant.id}
                    className="border-b border-border hover:bg-orange-50/30"
                  >
                    <td className="px-3 py-2">
                      <button onClick={() => toggleExpand(variant.id)} className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--color-navy)]">{variant.sku}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{variant.barcode ?? "—"}</td>
                    <td className="px-3 py-2">{variant.size ?? "—"}</td>
                    <td className="px-3 py-2">{variant.colour ?? "—"}</td>
                    {canViewCost && (
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {variant.cost_price ? `Rs. ${parseFloat(variant.cost_price).toFixed(2)}` : "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      Rs. {parseFloat(variant.retail_price).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {variant.wholesale_price ? `Rs. ${parseFloat(variant.wholesale_price).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", stockBadgeClass(stock, threshold))}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs">{threshold}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditVariant(variant)}
                          className="h-7 px-2 text-xs"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteVariant(variant)}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${variant.id}-images`} className="bg-background">
                      <td colSpan={canViewCost ? 11 : 10} className="px-6 py-3">
                        {images.length > 0 ? (
                          <div className="flex gap-2">
                            {images.map((url: string, i: number) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={url}
                                alt={`${variant.sku} image ${i + 1}`}
                                className="h-15 w-15 rounded border border-border object-cover"
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">No images uploaded</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}

            {variants.length === 0 && (
              <tr>
                <td colSpan={canViewCost ? 11 : 10} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No variants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editVariant && (
        <VariantEditSheet
          isOpen={!!editVariant}
          onClose={() => setEditVariant(null)}
          variant={editVariant}
          productId={product.id}
        />
      )}

      {deleteVariant && (
        <ConfirmDeleteDialog
          variantSku={deleteVariant.sku}
          onConfirm={handleDelete}
          onCancel={() => setDeleteVariant(null)}
        />
      )}

      <BarcodeLabelDialog
        isOpen={showLabelDialog}
        onClose={() => setShowLabelDialog(false)}
        variants={variants.map((v) => ({
          ...v,
          productName: product.name,
          ...(product.brand_name != null ? { brandName: product.brand_name } : {}),
        }))}
      />
    </div>
  );
}
