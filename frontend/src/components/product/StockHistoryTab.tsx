"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { mergeSearchParams } from "@/lib/urlUtils";
import type { StockMovement } from "@/types/catalog";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const REASON_STYLES: Record<string, string> = {
  SALE: "bg-blue-100 text-blue-700 border-blue-200",
  RETURN: "bg-purple-100 text-purple-700 border-purple-200",
  ADJUSTMENT: "bg-orange-100 text-orange-700 border-orange-200",
  IMPORT: "bg-teal-100 text-teal-700 border-teal-200",
  RECOUNT: "bg-gray-100 text-gray-700 border-gray-200",
  PURCHASE_RECEIPT: "bg-green-100 text-green-700 border-green-200",
  STOCK_TAKE_ADJUSTMENT: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

interface StockHistoryTabProps {
  productId: string;
}

export function StockHistoryTab({ productId }: StockHistoryTabProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);

  const fromDate = searchParams.get("from") ?? "";
  const toDate = searchParams.get("to") ?? "";

  const { data, isLoading } = useQuery<{ results: StockMovement[]; count: number }>({
    queryKey: ["stock-movements", productId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ product_id: productId, page_size: "25" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`${API_BASE}/api/catalog/stock-movements/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stock movements");
      return res.json();
    },
    enabled: !!accessToken && !!productId,
    staleTime: 30000,
  });

  const movements = data?.results ?? [];

  const setDateParam = (key: "from" | "to", value: string) => {
    router.push("?" + mergeSearchParams(searchParams, { [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Date filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setDateParam("from", e.target.value)}
            className="h-8 w-40 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setDateParam("to", e.target.value)}
            className="h-8 w-40 text-sm"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            onClick={() => router.push("?" + mergeSearchParams(searchParams, { from: "", to: "" }))}
            className="text-xs text-[var(--color-orange)] hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-xs font-semibold text-[var(--color-navy)]">
              <th className="px-3 py-3 text-left">Date / Time</th>
              <th className="px-3 py-3 text-left">Variant</th>
              <th className="px-3 py-3 text-left">Type</th>
              <th className="px-3 py-3 text-right">Delta</th>
              <th className="px-3 py-3 text-right">Before → After</th>
              <th className="px-3 py-3 text-left">Actor</th>
              <th className="px-3 py-3 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              movements.map((m) => {
                const date = new Date(m.created_at ?? "");
                const delta = m.quantity_delta;
                return (
                  <tr key={m.id} className="border-b border-border hover:bg-orange-50/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <span title={date.toISOString()}>
                        {date.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{m.variant_sku}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-semibold",
                          REASON_STYLES[m.reason] ?? "bg-gray-100 text-gray-700",
                        )}
                      >
                        {m.reason}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right text-xs font-semibold",
                        delta > 0 ? "text-green-600" : "text-red-500",
                      )}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {m.quantity_before} → {m.quantity_after}
                    </td>
                    <td className="px-3 py-2 text-xs">{m.actor_name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs italic text-muted-foreground">
                      {m.note ?? "—"}
                    </td>
                  </tr>
                );
              })}

            {!isLoading && movements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No stock movements found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
