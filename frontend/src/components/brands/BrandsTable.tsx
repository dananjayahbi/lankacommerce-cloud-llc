"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useBrands } from "@/hooks/useBrands";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Brand } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface BrandsTableProps {
  onEdit: (brand: Brand) => void;
}

export function BrandsTable({ onEdit }: BrandsTableProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useBrands();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/catalog/brands/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 409) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Cannot delete — products are assigned");
      }
      if (!res.ok) throw new Error("Failed to delete brand");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brands"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background text-xs font-semibold text-[var(--color-navy)]">
            <th className="px-4 py-3 text-left">Brand Name</th>
            <th className="px-4 py-3 text-left">Logo</th>
            <th className="px-4 py-3 text-right">Products</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading &&
            brands.map((brand) => (
              <tr
                key={brand.id}
                className="border-b border-border hover:bg-orange-50/30"
              >
                <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">
                  {brand.name}
                </td>
                <td className="px-4 py-3">
                  {brand.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="h-10 w-10 rounded border border-border object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded border border-border bg-background" />
                  )}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {(brand as any).product_count ?? 0}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(brand)}
                      className="h-7 px-2"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </Button>
                    {((brand as any).product_count ?? 0) === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(brand.id)}
                        className="h-7 px-2 text-destructive hover:text-destructive"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

          {!isLoading && brands.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">
                No brands yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
