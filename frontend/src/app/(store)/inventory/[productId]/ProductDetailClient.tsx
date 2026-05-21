"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductStatusBadge } from "@/components/inventory/ProductStatusBadge";
import { ProductDetailTabs } from "@/components/product/ProductDetailTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProduct } from "@/hooks/useProduct";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { toast } from "sonner";
import { WizardStep1BasicInfo } from "@/components/wizard/WizardStep1BasicInfo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface ProductDetailClientProps {
  productId: string;
}

export function ProductDetailClient({ productId }: ProductDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { can, role } = usePermissions();
  const isOwner = role === "OWNER";

  const { data: product, isLoading } = useProduct(productId);

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const newStatus = product?.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
      const res = await fetch(`${API_BASE}/api/catalog/products/${productId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
      toast.success("Product status updated");
    },
    onError: () => toast.error("Failed to update product status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/products/${productId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
      router.push("/inventory");
    },
    onError: () => toast.error("Failed to delete product"),
  });

  if (isLoading || !product) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between">
            <div>
              {/* Breadcrumb */}
              <nav className="text-xs text-muted-foreground">
                <Link href="/inventory" className="hover:underline">
                  Inventory
                </Link>
                {" › "}
                <span className="text-[var(--color-navy)]">{product.name}</span>
              </nav>

              {/* Product name */}
              <h1 className="mt-1 text-2xl font-bold text-[var(--color-navy)]">
                {product.name}
              </h1>

              {/* Metadata pills */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {product.category_name && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                    {product.category_name}
                  </span>
                )}
                {product.brand_name && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                    {product.brand_name}
                  </span>
                )}
                <ProductStatusBadge product={product} />
              </div>
            </div>

            {/* Button group */}
            <div className="flex items-center gap-2">
              {can(PERMISSIONS.PRODUCTS_EDIT) && (
                <Button variant="outline" size="sm" onClick={() => setShowEditSheet(true)}>
                  Edit Product
                </Button>
              )}
              {can(PERMISSIONS.PRODUCTS_EDIT) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  className="text-muted-foreground"
                >
                  {product.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                </Button>
              )}
              {isOwner && can(PERMISSIONS.PRODUCTS_DELETE) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-6xl">
        <ProductDetailTabs product={product} />
      </div>

      {/* Edit Product Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[540px]">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle>Edit Product</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            {/* Reuse wizard Step1 form for editing — it handles its own submit */}
            <p className="mb-4 text-xs text-muted-foreground">
              Note: Changes to variants are made from the Variants tab.
            </p>
            {/* TODO: wire a standalone edit form (not wizard store-backed) */}
            <p className="text-sm text-muted-foreground italic">Edit form — implementation pending.</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will soft-delete the product and all its variants. This action cannot be undone from the UI.
            </p>
            <p className="text-sm">
              Type <strong>{product.name}</strong> to confirm:
            </p>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={product.name}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                disabled={deleteConfirmName !== product.name || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
