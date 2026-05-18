"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type RowStatus = "valid" | "warning" | "error";

interface MappedRow {
  index: number;
  productName: string;
  sku: string;
  retailPrice: string;
  category?: string;
  brand?: string;
  status: RowStatus;
  messages: string[];
  raw: Record<string, string>;
}

interface ImportPreviewTableProps {
  csvRows: Record<string, string>[];
  mapping: Record<string, string>;
  onBack: () => void;
}

const PAGE_SIZE = 25;

export function ImportPreviewTable({ csvRows, mapping, onBack }: ImportPreviewTableProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const [page, setPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);

  const categoryNames = new Set(categories.map((c) => c.name.toLowerCase()));
  const brandNames = new Set(brands.map((b) => b.name.toLowerCase()));

  const mapped: MappedRow[] = useMemo(() => {
    return csvRows.map((row, i) => {
      const get = (field: string) => row[mapping[field] ?? ""] ?? "";
      const messages: string[] = [];
      let status: RowStatus = "valid";

      const productName = get("Product Name");
      const retailPrice = get("Retail Price");
      const sku = get("SKU") || get("Barcode");

      if (!productName) { messages.push("Missing Product Name"); status = "error"; }
      if (!retailPrice || isNaN(parseFloat(retailPrice)) || parseFloat(retailPrice) <= 0) {
        messages.push("Invalid Retail Price"); status = "error";
      }

      const category = get("Category");
      if (category && !categoryNames.has(category.toLowerCase())) {
        messages.push(`Category "${category}" not found — will be created`);
        if (status !== "error") status = "warning";
      }

      const brand = get("Brand");
      if (brand && !brandNames.has(brand.toLowerCase())) {
        messages.push(`Brand "${brand}" not found — will be created`);
        if (status !== "error") status = "warning";
      }

      return { index: i + 1, productName, sku, retailPrice, category, brand, status, messages, raw: row };
    });
  }, [csvRows, mapping, categoryNames, brandNames]);

  const validCount = mapped.filter((r) => r.status === "valid").length;
  const warnCount = mapped.filter((r) => r.status === "warning").length;
  const errorCount = mapped.filter((r) => r.status === "error").length;
  const totalPages = Math.ceil(mapped.length / PAGE_SIZE);
  const pageRows = mapped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleImport = async () => {
    const importRows = mapped.filter((r) => r.status !== "error");
    setIsImporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/catalog/products/import/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          rows: importRows.map((r) => r.raw),
          mapping,
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      const json = await res.json();
      toast.success(`${json.created ?? "?"} products created, ${json.variants ?? "?"} variants added.`);
      router.push("/inventory");
    } catch {
      toast.error("Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const statusBadge = (status: RowStatus) => {
    const styles = {
      valid: "bg-green-100 text-green-700 border-green-200",
      warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
      error: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold capitalize", styles[status])}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 text-sm font-medium">
        <span className="text-green-600">{validCount} valid</span>
        <span className="text-yellow-600">{warnCount} warnings</span>
        <span className="text-red-600">{errorCount} errors</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-xs font-semibold text-[var(--color-navy)]">
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-3 py-3 text-left">Product Name</th>
              <th className="px-3 py-3 text-left">SKU</th>
              <th className="px-3 py-3 text-right">Retail Price</th>
              <th className="px-3 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.index} className="border-b border-border hover:bg-orange-50/30">
                <td className="px-3 py-2 text-xs text-muted-foreground">{row.index}</td>
                <td className="px-3 py-2 font-medium">{row.productName || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.sku || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {row.retailPrice ? `Rs. ${parseFloat(row.retailPrice).toFixed(2)}` : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-0.5">
                    {statusBadge(row.status)}
                    {row.messages.map((m, i) => (
                      <p key={i} className="text-xs italic text-muted-foreground">{m}</p>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-border px-2 py-1 disabled:opacity-50"
          >
            ←
          </button>
          <span>Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded border border-border px-2 py-1 disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>← Go back to fix errors</Button>
        <Button
          onClick={handleImport}
          disabled={isImporting || (validCount + warnCount) === 0}
          className="bg-[var(--color-navy)] text-white"
        >
          {isImporting
            ? "Importing..."
            : `Skip ${errorCount} errors and import ${validCount + warnCount} rows`}
        </Button>
      </div>
    </div>
  );
}
