"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { PaginatedProducts, ProductFilters } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchProducts(
  filters: ProductFilters,
  token: string | null,
): Promise<PaginatedProducts> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category_id) params.set("category_id", filters.category_id);
  if (filters.brand_id) params.set("brand_id", filters.brand_id);
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.is_archived !== undefined)
    params.set("is_archived", String(filters.is_archived));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));

  const res = await fetch(
    `${API_BASE}/api/catalog/products/?${params.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }

  const json = await res.json();
  return json as PaginatedProducts;
}

export function useProducts(filters: ProductFilters = {}) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters, accessToken),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: !!accessToken,
  });
}
