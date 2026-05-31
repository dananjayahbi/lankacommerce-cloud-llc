"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandsTable } from "@/components/brands/BrandsTable";
import { BrandEditSheet } from "@/components/brands/BrandEditSheet";
import { useBrands } from "@/hooks/useBrands";
import type { Brand } from "@/types/catalog";

export function BrandsClient() {
  const [editBrand, setEditBrand] = useState<Brand | null | "new">(null);
  const { data: brands = [] } = useBrands();

  const sheetBrand = editBrand === "new" ? null : editBrand;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-navy)]">Brands</h1>
            <p className="text-sm text-muted-foreground">{brands.length} brands</p>
          </div>
          <Button
            onClick={() => setEditBrand("new")}
            className="bg-[var(--color-navy)] text-white"
          >
            + New Brand
          </Button>
        </div>

        <BrandsTable onEdit={(brand) => setEditBrand(brand)} />
      </div>

      <BrandEditSheet
        isOpen={editBrand !== null}
        onClose={() => setEditBrand(null)}
        brand={sheetBrand}
      />
    </div>
  );
}
