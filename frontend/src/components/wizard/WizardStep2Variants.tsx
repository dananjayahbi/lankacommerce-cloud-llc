"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { SizeChipInput } from "./SizeChipInput";
import { ColourChipInput } from "./ColourChipInput";
import { VariantMatrixTable } from "./VariantMatrixTable";
import { useProductWizardStore } from "@/stores/productWizardStore";
import { productStep2Schema, type ProductStep2Data, type VariantRow } from "@/schemas/productSchema";

function generateSku(productName: string, size: string, colour: string): string {
  const namePart = productName.slice(0, 3).toUpperCase();
  const sizePart = size.toUpperCase().replace(/\s+/g, "");
  const colourPart = colour.slice(0, 4).toUpperCase().replace(/\s+/g, "");
  return `${namePart}-${sizePart}-${colourPart}`;
}

function generateUniqueSkus(rows: VariantRow[]): VariantRow[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const base = row.sku;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? row : { ...row, sku: `${base}${String(count).padStart(2, "0")}` };
  });
}

function buildMatrix(
  sizes: string[],
  colours: string[],
  productName: string,
  existing: Map<string, VariantRow>,
): VariantRow[] {
  if (sizes.length === 0 && colours.length === 0) return [];

  const effectiveSizes = sizes.length > 0 ? sizes : [""];
  const effectiveColours = colours.length > 0 ? colours : [""];

  const rows: VariantRow[] = [];
  for (const size of effectiveSizes) {
    for (const colour of effectiveColours) {
      const key = `${size}|${colour}`;
      const prev = existing.get(key);
      rows.push(
        prev ?? {
          combinationKey: key,
          size,
          colour,
          sku: generateSku(productName, size || "ONE", colour || "STD"),
          costPrice: "",
          retailPrice: "",
          wholesalePrice: "",
          lowStockThreshold: 5,
          selected: true,
        },
      );
    }
  }
  return generateUniqueSkus(rows);
}

export function WizardStep2Variants() {
  const { step1Data, step2Data, setStep2Data, goToStep } =
    useProductWizardStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductStep2Data>({
    resolver: zodResolver(productStep2Schema),
    defaultValues: {
      sizes: step2Data.sizes ?? [],
      colours: step2Data.colours ?? [],
      variants: step2Data.variants ?? [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "variants",
    keyName: "combinationKey",
  });

  const sizes = watch("sizes");
  const colours = watch("colours");
  const variants = watch("variants");

  // Rebuild matrix when sizes/colours change
  useEffect(() => {
    const existing = new Map(variants.map((v) => [v.combinationKey, v]));
    const newRows = buildMatrix(
      sizes,
      colours,
      step1Data.name ?? "PRD",
      existing,
    );
    replace(newRows);
  }, [sizes, colours]); // eslint-disable-line react-hooks/exhaustive-deps

  const [validationError, setValidationError] = useState("");

  const onSubmit = (data: ProductStep2Data) => {
    const selectedVariants = data.variants.filter((v) => v.selected);
    if (selectedVariants.length === 0) {
      setValidationError("Select at least one variant to continue.");
      return;
    }
    const pricingErrors = selectedVariants.filter(
      (v) =>
        !v.costPrice ||
        !v.retailPrice ||
        parseFloat(v.retailPrice) < parseFloat(v.costPrice),
    );
    if (pricingErrors.length > 0) {
      setValidationError(
        `${pricingErrors.length} variant${pricingErrors.length > 1 ? "s" : ""} have invalid pricing. Retail price must be ≥ cost price.`,
      );
      return;
    }
    setValidationError("");
    setStep2Data(data);
    goToStep(3);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Axis panels */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-navy)]">Sizes</h3>
          <SizeChipInput
            value={sizes}
            onChange={(v) => setValue("sizes", v)}
          />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-navy)]">Colours</h3>
          <ColourChipInput
            value={colours}
            onChange={(v) => setValue("colours", v)}
          />
        </div>
      </div>

      {/* Variant matrix */}
      {fields.length > 0 ? (
        <div className="space-y-3">
          {validationError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {validationError}
            </div>
          )}
          <VariantMatrixTable
            fields={fields as any}
            register={register}
            watch={watch}
            setValue={setValue}
          />
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          Add sizes and/or colours above to generate variants
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => goToStep(1)}
        >
          ← Back
        </Button>
        <Button
          type="submit"
          className="bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90"
        >
          Next: Review →
        </Button>
      </div>
    </form>
  );
}
