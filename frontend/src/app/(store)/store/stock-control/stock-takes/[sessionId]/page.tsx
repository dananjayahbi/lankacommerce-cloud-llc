"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { LockIcon, Loader2Icon, QrCodeIcon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StockTakeSession, StockTakeItem } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function PermissionDenied() {
  return (
    <div className="rounded-xl border border-border bg-white p-8 text-center">
      <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-[#1B2B3A]">Access Restricted</h2>
      <p className="mt-1 text-sm text-[#64748B]">You don't have permission to record stock counts.</p>
      <Link href="/store/stock-control/stock-takes" className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline">
        ← Back to Stock Takes
      </Link>
    </div>
  );
}

export default function StockTakeCountingPage() {
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [barcodeInput, setBarcodeInput] = useState("");
  const [flashedRowId, setFlashedRowId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["stock-take-session", sessionId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/${sessionId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Session not found");
      const json = await res.json();
      return json.data as { session: StockTakeSession; items: StockTakeItem[] };
    },
    enabled: !!sessionId && !!accessToken,
    staleTime: 10_000,
  });

  // Redirect to review page if not IN_PROGRESS
  useEffect(() => {
    if (data?.session && data.session.status !== "IN_PROGRESS") {
      router.replace(`/store/stock-control/stock-takes/${sessionId}/review`);
    }
  }, [data?.session, sessionId, router]);

  const { mutate: updateItem } = useMutation({
    mutationFn: async ({ itemId, counted_quantity, needs_recount }: { itemId: string; counted_quantity?: number | null; needs_recount?: boolean }) => {
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/${sessionId}/items/${itemId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ counted_quantity, needs_recount }),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-take-session", sessionId] });
    },
  });

  const { mutate: completeSession, isPending: completing } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/${sessionId}/complete/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to submit for approval");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock take submitted for approval.");
      qc.invalidateQueries({ queryKey: ["stock-takes-list"] });
      router.replace(`/store/stock-control/stock-takes/${sessionId}/review`);
    },
    onError: () => {
      toast.error("Failed to submit stock take. Please try again.");
    },
  });

  if (!can(PERMISSIONS.STOCK_TAKE_MANAGE)) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <PermissionDenied />
      </main>
    );
  }

  const session = data?.session;
  const items = data?.items ?? [];

  const countedItems = items.filter((i) => i.counted_quantity !== null);
  const progress = items.length > 0 ? (countedItems.length / items.length) * 100 : 0;

  function handleBarcodeScan(e: React.FormEvent) {
    e.preventDefault();
    const q = barcodeInput.trim().toLowerCase();
    if (!q) return;
    const match = items.find(
      (i) =>
        i.variant_barcode?.toLowerCase() === q ||
        i.variant_sku.toLowerCase() === q,
    );
    setBarcodeInput("");
    if (!match) {
      toast.warning(`No variant found for "${barcodeInput.trim()}"`);
      return;
    }
    const row = rowRefs.current[match.id];
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashedRowId(match.id);
      setTimeout(() => setFlashedRowId(null), 1000);
    }
    // Focus the counted qty input in that row
    const input = row?.querySelector<HTMLInputElement>("input[data-counted]");
    input?.focus();
    input?.select();
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/store/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <Link href="/store/stock-control" className="hover:underline">Stock Control</Link>
        <span className="mx-1">›</span>
        <Link href="/store/stock-control/stock-takes" className="hover:underline">Stock Takes</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">
          {session?.category_name ? session.category_name : "Full Catalog"}
        </span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B3A]">Stock Count</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Enter physical counts for each variant. Scan a barcode to jump to a row.
          </p>
        </div>
        <Button
          className="bg-[#1B2B3A] hover:bg-[#1B2B3A]/90"
          disabled={completing || items.length === 0 || isLoading}
          onClick={() => completeSession()}
        >
          {completing ? (
            <><Loader2Icon className="mr-2 size-4 animate-spin" /> Submitting…</>
          ) : (
            "Submit for Approval"
          )}
        </Button>
      </div>

      {/* Progress */}
      {!isLoading && (
        <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-[#1B2B3A]">Counting Progress</span>
            <span className="text-[#64748B]">{countedItems.length} of {items.length} variants counted</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#1B2B3A] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-[#64748B]">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Barcode scanner */}
      <form onSubmit={handleBarcodeScan} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <QrCodeIcon className="absolute left-3 top-2.5 size-4 text-[#64748B]" />
          <Input
            className="pl-9 text-base font-medium focus:ring-2 focus:ring-blue-500"
            placeholder="Scan barcode or enter SKU…"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="outline">Find</Button>
      </form>

      {/* Items table */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left">
              <th className="px-4 py-3 font-medium text-[#64748B]">Product</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Variant</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">System Qty</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Counted Qty</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Discrepancy</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Recount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              : items.map((item) => {
                const discrepancy =
                  item.counted_quantity !== null
                    ? item.counted_quantity - item.system_quantity
                    : null;
                return (
                  <tr
                    key={item.id}
                    ref={(el) => { rowRefs.current[item.id] = el; }}
                    className={cn(
                      "border-b border-[#E2E8F0] last:border-0 transition-colors",
                      flashedRowId === item.id ? "bg-orange-100" : "hover:bg-slate-50",
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1B2B3A]">{item.product_name}</p>
                      <p className="text-xs text-[#64748B]">{item.category_name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm text-[#1B2B3A]">{item.variant_sku}</p>
                      <p className="text-xs text-[#64748B]">
                        {[item.variant_size, item.variant_colour].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#1B2B3A]">{item.system_quantity}</td>
                    <td className="px-4 py-3 w-28">
                      <Input
                        data-counted
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={item.counted_quantity ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === "") {
                            updateItem({ itemId: item.id, counted_quantity: null });
                          } else {
                            updateItem({ itemId: item.id, counted_quantity: parseInt(v, 10) });
                          }
                        }}
                        className="h-8 w-24 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {discrepancy !== null ? (
                        <span className={discrepancy === 0 ? "text-[#64748B]" : discrepancy > 0 ? "text-green-600" : "text-red-500"}>
                          {discrepancy > 0 ? "+" : ""}{discrepancy}
                        </span>
                      ) : (
                        <span className="text-[#64748B]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.needs_recount ?? false}
                        onChange={(e) => updateItem({ itemId: item.id, needs_recount: e.target.checked })}
                        className="size-4 rounded accent-amber-500"
                        title="Flag for recount"
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
