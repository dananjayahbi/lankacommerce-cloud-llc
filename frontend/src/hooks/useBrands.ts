"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { Brand } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchBrands(token: string | null): Promise<Brand[]> {
  const res = await fetch(`${API_BASE}/api/catalog/brands/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch brands: ${res.status}`);
  const json = await res.json();
  return json.data as Brand[];
}

export function useBrands() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["brands"],
    queryFn: () => fetchBrands(accessToken),
    staleTime: 60_000,
    enabled: !!accessToken,
  });
}
