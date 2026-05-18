"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { Product } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function useProduct(productId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<Product>({
    queryKey: ["products", productId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/products/${productId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch product");
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!accessToken && !!productId,
    staleTime: 30000,
  });
}
