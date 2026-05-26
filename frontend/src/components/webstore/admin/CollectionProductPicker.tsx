"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { Search, Loader2, Check, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface PickedProduct {
  id: string;
  name: string;
  sku: string;
  image_url: string | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  image_url: string | null;
}

interface CollectionProductPickerProps {
  open: boolean;
  selectedIds: string[];
  onConfirm: (products: PickedProduct[]) => void;
  onClose: () => void;
}

export function CollectionProductPicker({
  open,
  selectedIds,
  onConfirm,
  onClose,
}: CollectionProductPickerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [selectedProducts, setSelectedProducts] = useState<Map<string, PickedProduct>>(new Map());
  const debouncedSearch = useDebounce(search, 300);

  const { data: products = [], isLoading } = useQuery<CatalogProduct[]>({
    queryKey: ["catalog-products-picker", debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(
        `${API_BASE}/api/catalog/products/?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return [];
      const data = await res.json();
      // Handle both paginated and non-paginated responses
      return Array.isArray(data) ? data : (data.results ?? []);
    },
    enabled: !!accessToken && open,
  });

  function toggleProduct(product: CatalogProduct) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.add(product.id);
      }
      return next;
    });
    setSelectedProducts((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, {
          id: product.id,
          name: product.name,
          sku: product.sku,
          image_url: product.image_url,
        });
      }
      return next;
    });
  }

  function handleConfirm() {
    const picked: PickedProduct[] = Array.from(selected).map(
      (id) =>
        selectedProducts.get(id) ?? {
          id,
          name: id,
          sku: "",
          image_url: null,
        },
    );
    onConfirm(picked);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Products to Collection</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Package className="w-7 h-7 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            products.map((product) => {
              const isSelected = selected.has(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg p-3 border transition-colors text-left",
                    isSelected
                      ? "border-[#F97316] bg-orange-50"
                      : "border-slate-200 hover:border-slate-300 bg-white",
                  )}
                >
                  <div className="w-10 h-10 rounded bg-slate-100 shrink-0 overflow-hidden">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {product.sku}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-[#F97316] border-[#F97316]"
                        : "border-slate-300",
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-[#F97316] hover:bg-orange-600 text-white"
          >
            Add {selected.size > 0 ? `${selected.size} ` : ""}Products
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
