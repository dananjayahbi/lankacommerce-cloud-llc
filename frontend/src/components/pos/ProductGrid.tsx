"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, XCircleIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { CategoryTabs } from "./CategoryTabs";
import { ProductCard } from "./ProductCard";
import { VariantSelectionModal } from "./VariantSelectionModal";
import type { Product } from "@/types/catalog";
import type { Category } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const POS_LARGE_CATALOG_THRESHOLD = 500;

async function fetchProducts(token: string | null): Promise<Product[]> {
  if (!token) return [];
  const res = await fetch(`${API_BASE}/api/catalog/products/?status=ACTIVE`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  const raw = json.data ?? json;
  if (Array.isArray(raw)) return raw as Product[];
  if (Array.isArray(raw?.results)) return raw.results as Product[];
  return [];
}

async function fetchProductsBySearch(
  token: string | null,
  query: string,
): Promise<Product[]> {
  if (!token || !query) return [];
  const res = await fetch(
    `${API_BASE}/api/catalog/products/?status=ACTIVE&search=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  const raw = json.data ?? json;
  if (Array.isArray(raw)) return raw as Product[];
  if (Array.isArray(raw?.results)) return raw.results as Product[];
  return [];
}

// Skeleton tile
function SkeletonCard() {
  return (
    <div className="h-[165px] w-full animate-pulse overflow-hidden rounded-xl bg-[#F1F5F9]">
      <div className="h-[99px] w-full bg-[#E2E8F0]" />
      <div className="space-y-2 p-2">
        <div className="h-3 w-3/4 rounded bg-[#E2E8F0]" />
        <div className="h-3 w-1/2 rounded bg-[#E2E8F0]" />
      </div>
    </div>
  );
}

export function ProductGrid() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const addItem = useCartStore((s) => s.addItem);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);


  // All-products query
  const {
    data: allProducts = [],
    isLoading,
  } = useQuery<Product[]>({
    queryKey: ["pos-products"],
    queryFn: () => fetchProducts(accessToken),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (prev) => prev,
  });

  const isApiSearchMode = allProducts.length > POS_LARGE_CATALOG_THRESHOLD;

  // API-search query (only active when large catalog)
  const { data: searchResults = [] } = useQuery<Product[]>({
    queryKey: ["pos-products-search", debouncedSearch],
    queryFn: () => fetchProductsBySearch(accessToken, debouncedSearch),
    enabled: isApiSearchMode && debouncedSearch.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      if (searchInput) setSelectedCategoryId(null);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Derive unique categories
  const categories = useMemo<Category[]>(() => {
    const seen = new Map<string, Category>();
    for (const p of allProducts) {
      if (p.category_id && p.category_name && !seen.has(p.category_id)) {
        seen.set(p.category_id, {
          id: p.category_id,
          name: p.category_name,
          parent_id: null,
          parent_name: null,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  // Filtered products (client-side when catalog ≤ 500)
  const displayedProducts = useMemo<Product[]>(() => {
    if (isApiSearchMode && debouncedSearch) return searchResults;
    let list = allProducts;
    if (selectedCategoryId) {
      list = list.filter((p) => p.category_id === selectedCategoryId);
    }
    if (debouncedSearch && !isApiSearchMode) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.variants?.some((v) => v.sku.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [
    allProducts,
    selectedCategoryId,
    debouncedSearch,
    isApiSearchMode,
    searchResults,
  ]);

  const clearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
    searchInputRef.current?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#F1F5F9]">
      {/* Search bar */}
      <div className="shrink-0 bg-white px-4 py-3 shadow-sm">
        <div className="relative flex items-center">
          <SearchIcon
            size={16}
            className="absolute left-3 text-[#64748B]"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products or scan barcode…"
            className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-9 font-inter text-[14px] text-[#1B2B3A] placeholder:text-[#64748B] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 text-[#64748B] hover:text-[#1B2B3A]"
            >
              <XCircleIcon size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0]">
        <CategoryTabs
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      </div>

      {/* Product grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E2E8F0]">
              <SearchIcon size={24} className="text-[#64748B]" />
            </div>
            <p className="font-inter text-[14px] font-medium text-[#64748B]">
              No products found
            </p>
            <p className="mt-1 font-inter text-[12px] text-[#64748B]">
              Try a different search or category
            </p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            }}
          >
            {displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddDirectly={addItem}
                onOpenVariantModal={setActiveProductId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Variant selection modal */}
      {activeProductId && (
        <VariantSelectionModal
          productId={activeProductId}
          products={allProducts}
          onClose={() => setActiveProductId(null)}
        />
      )}
    </div>
  );
}
