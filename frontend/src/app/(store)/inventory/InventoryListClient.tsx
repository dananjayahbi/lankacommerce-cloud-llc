"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { InventoryFilterBar } from "@/components/inventory/InventoryFilterBar";
import { ActiveFilterChips } from "@/components/inventory/ActiveFilterChips";
import { BulkActionBar } from "@/components/inventory/BulkActionBar";
import { useProducts } from "@/hooks/useProducts";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuthStore } from "@/stores/authStore";
import { useInventorySelectionStore } from "@/stores/inventorySelectionStore";
import { mergeSearchParams } from "@/lib/urlUtils";
import { Plus, Upload, Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { ProductFilters } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function InventoryListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = 25;
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("categories")?.split(",")[0]; // Use first if multi
  const brandId = searchParams.get("brands")?.split(",")[0];
  const gender = searchParams.get("genders")?.split(",")[0] as ProductFilters["gender"];
  const isArchived = searchParams.get("status") === "archived" ? true : undefined;

  const filters: ProductFilters = {
    page,
    page_size: pageSize,
    search,
    category_id: categoryId,
    brand_id: brandId,
    gender,
    is_archived: isArchived,
  };

  const hasFilters = !!(search || categoryId || brandId || gender || isArchived !== undefined);

  const { data, isLoading } = useProducts(filters);

  const products = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;

  const handlePageChange = (newPage: number) => {
    const qs = mergeSearchParams(searchParams, { page: String(newPage) });
    router.push(`/inventory?${qs}`);
  };

  const handleArchive = async (productId: string) => {
    // Archive/unarchive: PATCH product status
    // Full implementation wires to API
    console.log("Archive", productId);
  };

  const handleDelete = async (productId: string) => {
    // Delete: show confirmation dialog then call API
    console.log("Delete", productId);
  };

  return (
    <div className="space-y-4">
      <InventoryFilterBar />
      <ActiveFilterChips />
      <InventoryTable
        products={products}
        isLoading={isLoading}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        hasFilters={hasFilters}
        canEdit={can(PERMISSIONS.PRODUCTS_EDIT)}
        canDelete={can(PERMISSIONS.PRODUCTS_DELETE)}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
      />
      <BulkActionBar />
    </div>
  );
}

interface InventoryListClientProps {
  initialCount: number;
  canCreate: boolean;
}

function ExportPopover({ visibleCount, searchParams }: { visibleCount: number; searchParams: URLSearchParams }) {
  const [isOpen, setIsOpen] = useState(false);
  const [includeCost, setIncludeCost] = useState(false);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { selectedProductIds } = useInventorySelectionStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleExport = async (mode: "visible" | "selected") => {
    setIsOpen(false);
    toast.info("Generating export…");
    try {
      const ids = mode === "selected" ? Array.from(selectedProductIds) : [];
      const qs = new URLSearchParams();
      if (includeCost) qs.set("include_cost", "1");
      if (mode === "visible") {
        // Pass current filters
        searchParams.forEach((v, k) => qs.set(k, v));
      } else {
        ids.forEach((id) => qs.append("ids", id));
      }

      const res = await fetch(`${API_BASE}/api/catalog/products/export-token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ mode, ids, include_cost: includeCost }),
      });
      if (!res.ok) throw new Error("Export request failed");
      const { download_token } = await res.json();
      const url = `${API_BASE}/api/catalog/products/export/?token=${download_token}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "products-export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started");
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((p) => !p)}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export
        <ChevronDown className="ml-1 h-3 w-3" />
      </Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-white p-3 shadow-lg">
            <div className="space-y-1">
              <button
                onClick={() => handleExport("visible")}
                className="w-full rounded px-3 py-2 text-left text-sm hover:bg-background"
              >
                Export visible products ({visibleCount})
              </button>
              <button
                onClick={() => handleExport("selected")}
                disabled={selectedProductIds.size === 0}
                className="w-full rounded px-3 py-2 text-left text-sm hover:bg-background disabled:cursor-not-allowed disabled:text-muted-foreground"
              >
                Export selected ({selectedProductIds.size} selected)
              </button>
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeCost}
                  onChange={(e) => setIncludeCost(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--color-navy)]"
                />
                Include cost prices
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function InventoryListClient({
  initialCount,
  canCreate,
}: InventoryListClientProps) {
  const { data } = useProducts({ page: 1, page_size: 1 });
  const totalCount = data?.meta.total ?? initialCount;
  const searchParams = new URLSearchParams();

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">
            Inventory
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? "product" : "products"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/import">
            <Button variant="outline" size="sm">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Import CSV
            </Button>
          </Link>
          <ExportPopover visibleCount={totalCount} searchParams={searchParams} />
          {canCreate && (
            <Link href="/inventory/new">
              <Button
                size="sm"
                className="bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main content with filter state via URL */}
      <Suspense>
        <InventoryListInner />
      </Suspense>
    </div>
  );
}
