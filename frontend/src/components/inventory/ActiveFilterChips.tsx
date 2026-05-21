"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { mergeSearchParams, getParamArray } from "@/lib/urlUtils";
import { X } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { cn } from "@/lib/utils";

export function ActiveFilterChips() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  const activeCategories = getParamArray(searchParams, "categories");
  const activeBrands = getParamArray(searchParams, "brands");
  const activeGenders = getParamArray(searchParams, "genders");
  const activeStatus = searchParams.get("status");

  const hasFilters =
    activeCategories.length > 0 ||
    activeBrands.length > 0 ||
    activeGenders.length > 0 ||
    !!activeStatus;

  if (!hasFilters) return null;

  const removeParam = (updates: Record<string, string | null>) => {
    const qs = mergeSearchParams(searchParams, { ...updates, page: "1" });
    router.push(`/store/inventory?${qs}`);
  };

  const clearAll = () => {
    router.push("/store/inventory");
  };

  const chipBase = "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs border";
  const defaultChip = "border-border bg-surface text-[var(--color-navy)]";
  const activeChip = "border-[var(--color-orange)] bg-[var(--color-orange)] text-white";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeCategories.map((catId) => {
        const cat = categories.find((c) => c.id === catId);
        return (
          <span key={catId} className={cn(chipBase, activeChip)}>
            Category: {cat?.name ?? catId}
            <button
              onClick={() => {
                const next = activeCategories.filter((c) => c !== catId);
                removeParam({ categories: next.length ? next.join(",") : null });
              }}
              aria-label="Remove category filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {activeBrands.map((brandId) => {
        const brand = brands.find((b) => b.id === brandId);
        return (
          <span key={brandId} className={cn(chipBase, activeChip)}>
            Brand: {brand?.name ?? brandId}
            <button
              onClick={() => {
                const next = activeBrands.filter((b) => b !== brandId);
                removeParam({ brands: next.length ? next.join(",") : null });
              }}
              aria-label="Remove brand filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {activeGenders.map((gender) => (
        <span key={gender} className={cn(chipBase, activeChip)}>
          Gender: {gender}
          <button
            onClick={() => {
              const next = activeGenders.filter((g) => g !== gender);
              removeParam({ genders: next.length ? next.join(",") : null });
            }}
            aria-label="Remove gender filter"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {activeStatus && (
        <span className={cn(chipBase, activeChip)}>
          Status: {activeStatus}
          <button onClick={() => removeParam({ status: null })} aria-label="Remove status filter">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      <button
        onClick={clearAll}
        className="text-xs text-[var(--color-orange)] hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}
