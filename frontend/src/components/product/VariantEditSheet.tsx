"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { useVariantMutation } from "@/hooks/useVariantMutation";
import { variantEditSchema, type VariantEditData } from "@/schemas/variantSchema";
import type { ProductVariant } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { WandIcon } from "lucide-react";
import { ProductImageUpload } from "@/components/product/ProductImageUpload";

function generateBarcode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  const suffix = Array.from(arr)
    .map((b) => chars[b % chars.length])
    .join("");
  return `LKC${suffix}`;
}

interface VariantEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant;
  productId: string;
}

export function VariantEditSheet({
  isOpen,
  onClose,
  variant,
  productId,
}: VariantEditSheetProps) {
  const { can } = usePermissions();
  const canViewCost = can(PERMISSIONS.PRODUCTS_VIEW_COST);
  const mutation = useVariantMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<VariantEditData>({
    resolver: zodResolver(variantEditSchema),
    defaultValues: {
      sku: variant.sku,
      barcode: variant.barcode ?? "",
      size: variant.size ?? "",
      colour: variant.colour ?? "",
      cost_price: variant.cost_price ?? "",
      retail_price: variant.retail_price,
      wholesale_price: variant.wholesale_price ?? "",
      low_stock_threshold: variant.low_stock_threshold ?? 5,
    },
  });

  // Reset when variant changes (editing different variant)
  useEffect(() => {
    reset({
      sku: variant.sku,
      barcode: variant.barcode ?? "",
      size: variant.size ?? "",
      colour: variant.colour ?? "",
      cost_price: variant.cost_price ?? "",
      retail_price: variant.retail_price,
      wholesale_price: variant.wholesale_price ?? "",
      low_stock_threshold: variant.low_stock_threshold ?? 5,
    });
  }, [variant.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const costPrice = watch("cost_price");
  const retailPrice = watch("retail_price");
  const retailBelowCost =
    costPrice && retailPrice
      ? parseFloat(retailPrice) < parseFloat(costPrice)
      : false;

  const handleCancel = () => {
    if (isDirty) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    onClose();
  };

  const onSubmit = (data: VariantEditData) => {
    // Only send dirty fields
    const payload: Record<string, unknown> = {};
    (Object.keys(dirtyFields) as Array<keyof VariantEditData>).forEach((key) => {
      if (dirtyFields[key]) {
        payload[key] = data[key];
      }
    });

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(
      { variantId: variant.id, productId, data: payload },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="font-semibold text-[var(--color-navy)]">
            Edit Variant
          </SheetTitle>
          <p className="font-mono text-xs text-muted-foreground">{variant.sku}</p>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 py-4">
          {/* SKU */}
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              {...register("sku")}
              className="font-mono"
              aria-invalid={!!errors.sku}
            />
            {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
          </div>

          {/* Barcode */}
          <div className="space-y-1.5">
            <Label htmlFor="barcode">Barcode</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                {...register("barcode")}
                className="font-mono"
                placeholder="Auto-generate or enter manually"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setValue("barcode", generateBarcode(), { shouldDirty: true })}
                title="Auto-generate barcode"
              >
                <WandIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Size + Colour */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="size">Size</Label>
              <Input id="size" {...register("size")} aria-invalid={!!errors.size} />
              {errors.size && <p className="text-xs text-destructive">{errors.size.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="colour">Colour</Label>
              <Input id="colour" {...register("colour")} aria-invalid={!!errors.colour} />
              {errors.colour && <p className="text-xs text-destructive">{errors.colour.message}</p>}
            </div>
          </div>

          {/* Cost Price (hidden when no permission) */}
          {canViewCost && (
            <div className="space-y-1.5">
              <Label htmlFor="cost_price">Cost Price</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rs.</span>
                <Input
                  id="cost_price"
                  {...register("cost_price")}
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-right font-mono"
                />
              </div>
            </div>
          )}

          {/* Retail Price */}
          <div className="space-y-1.5">
            <Label htmlFor="retail_price">Retail Price</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rs.</span>
              <Input
                id="retail_price"
                {...register("retail_price")}
                type="number"
                step="0.01"
                min="0"
                className={cn(
                  "text-right font-mono",
                  retailBelowCost && "border-[var(--color-orange)]",
                )}
                aria-invalid={!!errors.retail_price}
              />
            </div>
            {retailBelowCost && (
              <p className="text-xs text-[var(--color-orange)]">
                Retail price is below cost price
              </p>
            )}
          </div>

          {/* Wholesale Price */}
          <div className="space-y-1.5">
            <Label htmlFor="wholesale_price">Wholesale Price</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rs.</span>
              <Input
                id="wholesale_price"
                {...register("wholesale_price")}
                type="number"
                step="0.01"
                min="0"
                className="text-right font-mono"
              />
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div className="space-y-1.5">
            <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
            <Input
              id="low_stock_threshold"
              {...register("low_stock_threshold", { valueAsNumber: true })}
              type="number"
              min="0"
              className="w-24 text-right"
            />
          </div>

          {/* Image upload */}
          <div>
            <Label className="text-sm font-medium">Images</Label>
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <ProductImageUpload
                  imageUrls={field.value ?? []}
                  onImagesChange={field.onChange}
                />
              )}
            />
          </div>
        </form>

        <SheetFooter className="border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="variant-edit-form"
            onClick={handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            className="bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
