"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { useInventorySelectionStore } from "@/stores/inventorySelectionStore";
import type { Product } from "@/types/catalog";
import { Eye, Archive, Trash2, Plus } from "lucide-react";

// Inline SVG clothing icon placeholder
function ClothingIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded bg-muted text-muted-foreground"
    >
      <rect width="40" height="40" rx="4" fill="#F1F5F9" />
      <path
        d="M14 12L10 16L14 17V28H26V17L30 16L26 12L22 15C21 13 19 13 18 15L14 12Z"
        stroke="#94A3B8"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface InventoryTableProps {
  products: Product[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  hasFilters: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onArchive: (productId: string) => void;
  onDelete: (productId: string) => void;
  onPageChange: (page: number) => void;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function InventoryTable({
  products,
  isLoading,
  totalCount,
  page,
  pageSize,
  hasFilters,
  canEdit,
  canDelete,
  onArchive,
  onDelete,
  onPageChange,
}: InventoryTableProps) {
  const { selectedProductIds, toggleProduct, selectAll, clearSelection } =
    useInventorySelectionStore();

  const allSelected =
    products.length > 0 &&
    products.every((p) => selectedProductIds.has(p.id));

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(products.map((p) => p.id));
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  if (!isLoading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-4 text-muted-foreground"
        >
          <path
            d="M22 18L16 24L22 26V44H42V26L48 24L42 18L36 22C35 19 29 19 28 22L22 18Z"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <h3 className="mb-1 text-lg font-semibold text-[var(--color-navy)]">
          {hasFilters ? "No products match your filters" : "No products yet"}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your filters"
            : "Start building your catalog"}
        </p>
        {hasFilters ? (
          <Button variant="ghost" size="sm" className="text-[var(--color-orange)]">
            Clear filters
          </Button>
        ) : (
          <Link href="/inventory/new">
            <Button className="bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90">
              <Plus className="mr-1 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="bg-background">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead className="text-right">Variants</TableHead>
            <TableHead className="text-right">Total Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows />
          ) : (
            products.map((product) => {
              const firstImage = product.variants?.[0]?.image_urls?.[0];
              const totalStock =
                product.total_stock ??
                (product.variants ?? []).reduce(
                  (sum, v) => sum + v.stock_quantity,
                  0,
                );

              return (
                <TableRow
                  key={product.id}
                  className="hover:bg-orange/5 transition-colors"
                  data-state={
                    selectedProductIds.has(product.id) ? "selected" : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedProductIds.has(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {firstImage ? (
                        <Image
                          src={firstImage}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                      ) : (
                        <ClothingIcon />
                      )}
                      <Link
                        href={`/inventory/${product.id}`}
                        className="font-semibold text-[var(--color-navy)] hover:underline"
                      >
                        {product.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.category_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.brand_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs text-[var(--color-navy)]">
                      {product.gender}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {product.variant_count}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {totalStock}
                  </TableCell>
                  <TableCell>
                    <ProductStatusBadge
                      product={{
                        status: product.status,
                        variants: product.variants,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/inventory/${product.id}`}>
                        <Button variant="ghost" size="icon" aria-label="View product">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={
                            product.status === "ARCHIVED"
                              ? "Unarchive product"
                              : "Archive product"
                          }
                          onClick={() => onArchive(product.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete product"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {!isLoading && totalCount > pageSize && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {startItem}–{endItem} of {totalCount} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
