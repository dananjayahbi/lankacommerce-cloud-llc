"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useInventorySelectionStore } from "@/stores/inventorySelectionStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { BulkPriceUpdateDialog } from "./BulkPriceUpdateDialog";
import { BarcodeLabelDialog } from "./BarcodeLabelDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function BulkActionBar() {
  const { selectedProductIds, clearSelection } = useInventorySelectionStore();
  const { can } = usePermissions();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const count = selectedProductIds.size;

  if (count === 0) return null;

  const handleExportSelected = async () => {
    toast.info("Generating export…");
    try {
      const ids = Array.from(selectedProductIds);
      const res = await fetch(`${API_BASE}/api/catalog/products/export-token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ mode: "selected", ids }),
      });
      if (!res.ok) throw new Error("Export request failed");
      const { download_token } = await res.json();
      const url = `${API_BASE}/api/catalog/products/export/?token=${download_token}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "products-export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started");
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-[var(--color-navy)] shadow-lg">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-white">
            {count} {count === 1 ? "product" : "products"} selected
          </span>
          <div className="flex items-center gap-3">
            {can(PERMISSIONS.PRODUCTS_EDIT) && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={() => setShowPriceDialog(true)}
              >
                Bulk Price Update
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={() => setShowLabelDialog(true)}
            >
              Print Labels
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={handleExportSelected}
            >
              Export Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </div>

      <BulkPriceUpdateDialog
        isOpen={showPriceDialog}
        onClose={() => setShowPriceDialog(false)}
        productIds={Array.from(selectedProductIds)}
      />

      <BarcodeLabelDialog
        isOpen={showLabelDialog}
        onClose={() => setShowLabelDialog(false)}
        variants={[]}
      />
    </>
  );
}
