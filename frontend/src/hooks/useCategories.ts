"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { Category } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchCategories(token: string | null): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/api/catalog/categories/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  const json = await res.json();
  return json.data as Category[];
}

export function useCategories() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(accessToken),
    staleTime: 60_000,
    enabled: !!accessToken,
  });
}
