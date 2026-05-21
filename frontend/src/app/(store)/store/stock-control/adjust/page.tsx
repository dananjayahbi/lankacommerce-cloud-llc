"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { LockIcon, Loader2Icon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Product, ProductVariant } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const REASONS = [
  { value: "MANUAL_ADJUSTMENT", label: "Manual Adjustment" },
  { value: "INITIAL_STOCK", label: "Initial Stock Entry" },
  { value: "PURCHASE_RECEIPT", label: "Purchase Received" },
  { value: "SALE_RETURN", label: "Sale Return" },
  { value: "DAMAGE_WRITE_OFF", label: "Damaged / Write-off" },
  { value: "TRANSFER_IN", label: "Transfer In" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "STOCK_TAKE_ADJUSTMENT", label: "Stock Take Adjustment" },
];

function useDebounce<T>(value: T, ms: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debouncedValue;
}

// ── permission denied (shared inline) ────────────────────────────────────────

function PermissionDenied() {
  return (
    <div className="rounded-xl border border-border bg-white p-8 text-center">
      <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-[#1B2B3A]">Access Restricted</h2>
      <p className="mt-1 text-sm text-[#64748B]">
        You don't have permission to adjust stock. Contact your store owner.
      </p>
      <Link href="/store/stock-control" className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline">
        ← Back to Stock Control
      </Link>
    </div>
  );
}

// ── projected stock pill ──────────────────────────────────────────────────────

function projectedClass(projected: number, threshold: number): string {
  if (projected > threshold) return "text-green-600";
  if (projected > 0) return "text-amber-500";
  return "text-red-500";
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AdjustStockPage() {
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // form state
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  // Pre-select variant from URL param ?variant_id=
  const variantIdParam = searchParams.get("variant_id");

  // Product search
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ["product-search-adjust", debouncedSearch],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/catalog/products/?search=${encodeURIComponent(debouncedSearch)}&include_variants=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      return json.data as Product[];
    },
    enabled: debouncedSearch.length >= 2 && !!accessToken,
    staleTime: 30_000,
  });

  // If variant_id param provided, fetch product containing that variant
  const { data: prefillData } = useQuery<{ variant: ProductVariant; product: Product } | null>({
    queryKey: ["adjust-prefill-variant", variantIdParam],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/catalog/variants/${variantIdParam}/`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Variant not found");
      const json = await res.json();
      return json.data as { variant: ProductVariant; product: Product };
    },
    enabled: !!variantIdParam && !!accessToken,
  });

  // Populate selected product/variant when prefill data loads
  useEffect(() => {
    if (prefillData) {
      setSelectedProduct(prefillData.product);
      setSelectedVariant(prefillData.variant);
    }
  }, [prefillData]);

  // Submit mutation
  const { mutate: submitAdjustment, isPending } = useMutation({
    mutationFn: async () => {
      if (!selectedVariant || !reason || !quantity) throw new Error("Incomplete form");
      const delta =
        adjustType === "add"
          ? parseInt(quantity, 10)
          : -parseInt(quantity, 10);
      const res = await fetch(`${API_BASE}/api/catalog/stock/adjust/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          variant_id: selectedVariant.id,
          quantity_delta: delta,
          reason,
          note: note || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message ?? "Adjustment failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Stock adjusted successfully.");
      // Low-stock warning toast
      if (data?.data?.low_stock_triggered) {
        const sku = selectedVariant?.sku ?? "";
        const newQty = data?.data?.variant?.stock_quantity;
        const threshold = selectedVariant?.low_stock_threshold;
        toast.warning(
          `Low stock alert: ${sku} has fallen to ${newQty} units, below the threshold of ${threshold} units.`,
          { duration: 8000 },
        );
      }
      qc.invalidateQueries({ queryKey: ["stock-kpi-low-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-recent-movements"] });
      // reset
      setSelectedVariant(null);
      setSelectedProduct(null);
      setSearch("");
      setQuantity("");
      setReason("");
      setNote("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!can(PERMISSIONS.STOCK_ADJUST)) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <PermissionDenied />
      </main>
    );
  }

  const quantityNum = parseInt(quantity, 10);
  const currentStock = selectedVariant?.stock_quantity ?? 0;
  const threshold = selectedVariant?.low_stock_threshold ?? 0;
  const projected =
    quantity && !isNaN(quantityNum)
      ? adjustType === "add"
        ? currentStock + quantityNum
        : currentStock - quantityNum
      : null;
  const isNegativeProjected = projected !== null && projected < 0;
  const canSubmit =
    !!selectedVariant &&
    !!reason &&
    !!quantity &&
    !isNaN(quantityNum) &&
    quantityNum > 0 &&
    !isNegativeProjected &&
    !isPending;

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/store/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <Link href="/store/stock-control" className="hover:underline">Stock Control</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">Adjust Stock</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2B3A]">Manual Stock Adjustment</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Search for a product variant and record a precise stock change with a reason.
        </p>
      </div>

      <div className="mx-auto max-w-xl rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">

        {/* Step 1 — Product search */}
        <div className="space-y-1">
          <Label>Search Product</Label>
          <div className="relative">
            <Input
              placeholder="Type at least 2 characters…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedProduct(null);
                setSelectedVariant(null);
              }}
              autoComplete="off"
            />
            {searching && (
              <Loader2Icon className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Dropdown results */}
          {!selectedProduct && searchResults && searchResults.length > 0 && (
            <div className="z-10 mt-1 max-h-56 overflow-auto rounded-lg border border-[#E2E8F0] bg-white shadow-md">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(p);
                    setSearch(p.name);
                    setSelectedVariant(null);
                  }}
                  className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="font-medium text-[#1B2B3A]">{p.name}</span>
                  <span className="text-xs text-[#64748B]">{p.category_name ?? "Uncategorised"}</span>
                </button>
              ))}
            </div>
          )}
          {!selectedProduct && debouncedSearch.length >= 2 && !searching && searchResults?.length === 0 && (
            <p className="pt-1 text-xs text-[#64748B]">No products found.</p>
          )}
        </div>

        {/* Step 2 — Variant selector */}
        {selectedProduct && (
          <div className="mt-4 space-y-1">
            <Label>Select Variant</Label>
            <Select
              value={selectedVariant?.id ?? ""}
              onValueChange={(id) => {
                const v = selectedProduct.variants?.find((x) => x.id === id) ?? null;
                setSelectedVariant(v);
                setQuantity("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a variant…" />
              </SelectTrigger>
              <SelectContent>
                {(selectedProduct.variants ?? []).map((v) => {
                  const stockClass =
                    v.stock_quantity === 0
                      ? "text-red-500"
                      : v.stock_quantity <= v.low_stock_threshold
                        ? "text-amber-500"
                        : "text-green-600";
                  return (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm">{v.sku}</span>
                        {v.size && <span className="text-xs text-muted-foreground">{v.size}</span>}
                        {v.colour && <span className="text-xs text-muted-foreground">{v.colour}</span>}
                        <span className={cn("ml-auto text-xs font-medium", stockClass)}>
                          {v.stock_quantity === 0 ? "Out of Stock" : v.stock_quantity}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Step 3 — Adjustment type toggle */}
        {selectedVariant && (
          <div className="mt-4 space-y-1">
            <Label>Adjustment Type</Label>
            <div className="flex rounded-lg border border-[#E2E8F0] overflow-hidden">
              {(["add", "remove"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setAdjustType(t);
                    setQuantity("");
                  }}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    adjustType === t
                      ? "bg-[#1B2B3A] text-white"
                      : "bg-white text-[#1B2B3A] hover:bg-slate-50",
                  )}
                >
                  {t === "add" ? "Add Stock" : "Remove Stock"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Quantity + live preview */}
        {selectedVariant && (
          <div className="mt-4 space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="Enter quantity…"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {projected !== null && (
              <div className="mt-1 rounded-lg bg-slate-50 px-4 py-2 text-sm">
                <span className="text-[#64748B]">Projected stock: </span>
                <span className={cn("font-semibold", projectedClass(projected, threshold))}>
                  {projected} units
                </span>
              </div>
            )}
            {isNegativeProjected && (
              <p className="text-xs text-red-500">
                Adjustment would result in negative stock. Please check the quantity.
              </p>
            )}
          </div>
        )}

        {/* Step 5 — Reason */}
        {selectedVariant && (
          <div className="mt-4 space-y-1">
            <Label>Reason for Adjustment <span className="text-red-500">*</span></Label>
            <Select value={reason} onValueChange={(v) => setReason(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Step 6 — Note */}
        {selectedVariant && (
          <div className="mt-4 space-y-1">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="Additional context for this adjustment…"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
            />
            <p className={cn("text-right text-xs", note.length > 480 ? "text-amber-500" : "text-[#64748B]")}>
              {note.length} / 500 characters
            </p>
          </div>
        )}

        {/* Submit */}
        {selectedVariant && (
          <div className="mt-6">
            <Button
              className="w-full bg-[#1B2B3A] hover:bg-[#1B2B3A]/90"
              disabled={!canSubmit}
              onClick={() => submitAdjustment()}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" /> Recording…
                </>
              ) : (
                "Record Adjustment"
              )}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
