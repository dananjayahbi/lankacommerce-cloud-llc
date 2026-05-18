"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventorySelectionStore } from "@/stores/inventorySelectionStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const bulkPriceSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("FIXED"),
    costPrice: z.number().positive("Cost price must be positive").optional(),
    retailPrice: z.number().positive("Retail price must be positive"),
  }),
  z.object({
    mode: z.literal("PERCENT"),
    percentage: z.number().min(1).max(200),
    direction: z.enum(["INCREASE", "DECREASE"]),
    target: z.enum(["COST", "RETAIL", "BOTH"]),
  }),
]);

type BulkPriceFormData = z.infer<typeof bulkPriceSchema>;

interface BulkPriceUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
}

export function BulkPriceUpdateDialog({
  isOpen,
  onClose,
  productIds,
}: BulkPriceUpdateDialogProps) {
  const [activeMode, setActiveMode] = useState<"FIXED" | "PERCENT">("FIXED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { clearSelection } = useInventorySelectionStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  const { register, handleSubmit, control, formState: { errors } } = useForm<BulkPriceFormData>({
    resolver: zodResolver(bulkPriceSchema),
    defaultValues: { mode: "FIXED", retailPrice: undefined },
  });

  const onSubmit = async (data: BulkPriceFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/catalog/products/bulk-price-update/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productIds, ...data }),
      });
      if (!res.ok) throw new Error("Failed to update prices");
      clearSelection();
      onClose();
    } catch {
      // error toast would go here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[520px]">
        <DialogHeader>
          <DialogTitle>Bulk Price Update</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Updating {productIds.length} selected {productIds.length === 1 ? "product" : "products"}
          </p>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["FIXED", "PERCENT"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                activeMode === mode
                  ? "bg-[var(--color-navy)] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === "FIXED" ? "Set Fixed Price" : "Apply % Change"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("mode")} value={activeMode} />

          {activeMode === "FIXED" ? (
            <>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                ⚠ This price will apply to ALL variants of the {productIds.length} selected products.
              </div>
              <div className="space-y-2">
                <Label>New Retail Price (Rs.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("retailPrice" as never, { valueAsNumber: true })}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Percentage</Label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  placeholder="10"
                  {...register("percentage" as never, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="flex gap-2">
                  {(["INCREASE", "DECREASE"] as const).map((dir) => (
                    <label key={dir} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" {...register("direction" as never)} value={dir} />
                      <span className="text-sm">{dir === "INCREASE" ? "Increase" : "Decrease"}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--color-navy)] text-white"
            >
              Apply to All {productIds.length} Products
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
