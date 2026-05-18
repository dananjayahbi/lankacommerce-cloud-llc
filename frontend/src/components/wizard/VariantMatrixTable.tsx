"use client";

import React, { memo } from "react";
import type {
  UseFieldArrayReturn,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { ProductStep2Data } from "@/schemas/productSchema";
import { cn } from "@/lib/utils";

interface VariantRowProps {
  index: number;
  register: UseFormRegister<ProductStep2Data>;
  watch: UseFormWatch<ProductStep2Data>;
  isSelected: boolean;
}

const VariantMatrixRow = memo(function VariantMatrixRow({
  index,
  register,
  watch,
  isSelected,
}: VariantRowProps) {
  const costPrice = watch(`variants.${index}.costPrice`);
  const retailPrice = watch(`variants.${index}.retailPrice`);
  const isRetailBelowCost =
    costPrice && retailPrice
      ? parseFloat(retailPrice) < parseFloat(costPrice)
      : false;

  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-orange-50/30",
        !isSelected && "opacity-50",
      )}
    >
      <td className="px-3 py-2">
        <Checkbox {...(register(`variants.${index}.selected`) as any)} defaultChecked={isSelected} />
      </td>
      <td className="px-3 py-2">
        <Input
          {...register(`variants.${index}.sku`)}
          className="h-8 w-28 font-mono text-xs"
        />
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {watch(`variants.${index}.colour`)}
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {watch(`variants.${index}.size`)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Rs.</span>
          <Input
            {...register(`variants.${index}.costPrice`)}
            type="number"
            step="0.01"
            min="0"
            className="h-8 w-24 text-right font-mono text-xs"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Rs.</span>
          <Input
            {...register(`variants.${index}.retailPrice`)}
            type="number"
            step="0.01"
            min="0"
            className={cn(
              "h-8 w-24 text-right font-mono text-xs",
              isRetailBelowCost && "border-[var(--color-orange)]",
            )}
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Rs.</span>
          <Input
            {...register(`variants.${index}.wholesalePrice`)}
            type="number"
            step="0.01"
            min="0"
            className="h-8 w-24 text-right font-mono text-xs"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <Input
          {...register(`variants.${index}.lowStockThreshold`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="h-8 w-16 text-right text-xs"
        />
      </td>
    </tr>
  );
});

interface VariantMatrixTableProps {
  fields: UseFieldArrayReturn<ProductStep2Data, "variants">["fields"];
  register: UseFormRegister<ProductStep2Data>;
  watch: UseFormWatch<ProductStep2Data>;
  setValue: (name: string, value: unknown) => void;
}

export function VariantMatrixTable({
  fields,
  register,
  watch,
  setValue,
}: VariantMatrixTableProps) {
  const [applyAllCost, setApplyAllCost] = React.useState("");
  const [applyAllRetail, setApplyAllRetail] = React.useState("");

  const handleApplyAll = () => {
    fields.forEach((_, i) => {
      if (applyAllCost) setValue(`variants.${i}.costPrice`, applyAllCost);
      if (applyAllRetail) setValue(`variants.${i}.retailPrice`, applyAllRetail);
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          {/* Apply to all shortcut row */}
          <tr className="border-b-2 border-border bg-background">
            <td colSpan={4} className="px-3 py-2">
              <span className="text-xs italic text-muted-foreground">
                Apply to all variants
              </span>
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Rs.</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={applyAllCost}
                  onChange={(e) => setApplyAllCost(e.target.value)}
                  className="h-7 w-24 text-right font-mono text-xs"
                  placeholder="Cost"
                />
              </div>
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Rs.</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={applyAllRetail}
                  onChange={(e) => setApplyAllRetail(e.target.value)}
                  className="h-7 w-24 text-right font-mono text-xs"
                  placeholder="Retail"
                />
              </div>
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2">
              <button
                type="button"
                onClick={handleApplyAll}
                className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                Apply to All
              </button>
            </td>
          </tr>
          {/* Column headers */}
          <tr className="bg-background text-xs font-semibold text-[var(--color-navy)]">
            <th className="px-3 py-2 text-left w-10">✓</th>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Colour</th>
            <th className="px-3 py-2 text-left">Size</th>
            <th className="px-3 py-2 text-right">Cost Price</th>
            <th className="px-3 py-2 text-right">Retail Price</th>
            <th className="px-3 py-2 text-right">Wholesale</th>
            <th className="px-3 py-2 text-right">Low Stock</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <VariantMatrixRow
              key={field.combinationKey}
              index={index}
              register={register}
              watch={watch}
              isSelected={watch(`variants.${index}.selected`) ?? true}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
