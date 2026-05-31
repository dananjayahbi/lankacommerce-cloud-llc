"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { mergeSearchParams, getParamArray } from "@/lib/urlUtils";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export function InventoryFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  const activeCategories = getParamArray(searchParams, "categories");
  const activeBrands = getParamArray(searchParams, "brands");
  const activeStatus = searchParams.get("status") ?? "";

  // Sync search input with URL on mount
  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "");
  }, [searchParams]);

  const updateUrl = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const qs = mergeSearchParams(searchParams, { ...updates, page: "1" });
      router.push(`/store/inventory?${qs}`);
    },
    [router, searchParams],
  );

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateUrl({ search: val || null });
    }, 300);
  };

  const clearSearch = () => {
    setSearchInput("");
    updateUrl({ search: null });
  };

  const setStatus = (status: string) => {
    updateUrl({ status: status || null });
  };

  // Count active non-search filters
  const filterCount =
    activeCategories.length +
    activeBrands.length +
    (activeStatus ? 1 : 0);

  // Determine if search should use mono font (barcode/SKU heuristic)
  const isCodeLike = searchInput.length >= 8 && !searchInput.includes(" ");

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Search products, SKUs, barcodes..."
          className={cn(
            "pl-9 pr-9 border-border bg-background focus:bg-surface",
            isCodeLike && "font-mono",
          )}
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-orange)] hover:opacity-80"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter bar toggle row */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="ml-auto"
        >
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
          Filters
          {filterCount > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-navy)] px-1 text-xs text-white">
              {filterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-20">Category</span>
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const next = activeCategories.includes(cat.id)
                        ? activeCategories.filter((c) => c !== cat.id)
                        : [...activeCategories, cat.id];
                      updateUrl({ categories: next.length ? next : null });
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      activeCategories.includes(cat.id)
                        ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                        : "border-border bg-surface text-[var(--color-navy)] hover:border-[var(--color-navy)]",
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brand filter */}
          {brands.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-20">Brand</span>
              <div className="flex flex-wrap gap-1.5">
                {brands.slice(0, 8).map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      const next = activeBrands.includes(brand.id)
                        ? activeBrands.filter((b) => b !== brand.id)
                        : [...activeBrands, brand.id];
                      updateUrl({ brands: next.length ? next : null });
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      activeBrands.includes(brand.id)
                        ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                        : "border-border bg-surface text-[var(--color-navy)] hover:border-[var(--color-navy)]",
                    )}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    activeStatus === value
                      ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                      : "border-border bg-surface text-[var(--color-navy)] hover:border-[var(--color-navy)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
