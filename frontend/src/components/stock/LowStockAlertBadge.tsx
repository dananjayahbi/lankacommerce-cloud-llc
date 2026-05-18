"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface Props {
  /** Optional pre-fetched count from a parent query to avoid an extra network request */
  initialCount?: number;
}

export function LowStockAlertBadge({ initialCount }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ["stock-kpi-low-stock"],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/catalog/stock/low-stock/?count_only=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Count fetch failed");
      const json = await res.json();
      return (json.data?.count ?? 0) as number;
    },
    enabled: !!accessToken && initialCount === undefined,
    staleTime: 60_000,
    initialData: initialCount,
  });

  if (isLoading) {
    return <Skeleton className="h-9 w-64 rounded-lg" />;
  }

  const count = data ?? 0;
  if (count === 0) return null;

  return (
    <Link
      href="/stock-control/low-stock"
      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
    >
      <span>
        ⚠ {count} variant{count !== 1 ? "s" : ""} below low stock threshold
      </span>
      <ChevronRightIcon className="size-4 shrink-0" />
    </Link>
  );
}
