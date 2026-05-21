"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductImageUpload } from "@/components/product/ProductImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type { Brand } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const brandSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name too long"),
  description: z.string().max(300).optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
});

type BrandFormData = z.infer<typeof brandSchema>;

interface BrandEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null; // null = create new
}

export function BrandEditSheet({ isOpen, onClose, brand }: BrandEditSheetProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<BrandFormData>({
    resolver: standardSchemaResolver(brandSchema),
    defaultValues: { name: brand?.name ?? "", description: brand?.description ?? "" },
  });

  useEffect(() => {
    reset({ name: brand?.name ?? "", description: brand?.description ?? "" });
  }, [brand?.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const url = brand
        ? `${API_BASE}/api/catalog/brands/${brand.id}/`
        : `${API_BASE}/api/catalog/brands/`;
      const res = await fetch(url, {
        method: brand ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save brand");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success(brand ? "Brand updated" : "Brand created");
      onClose();
    },
    onError: () => toast.error("Failed to save brand"),
  });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[400px]">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle>{brand ? "Edit Brand" : "New Brand"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 px-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Brand Name *</Label>
            <Input
              id="brand-name"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-desc">Description</Label>
            <Textarea
              id="brand-desc"
              {...register("description")}
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Logo</label>
            <Controller
              name="logo_url"
              control={control}
              render={({ field }) => (
                <ProductImageUpload
                  imageUrls={field.value ? [field.value] : []}
                  onImagesChange={(urls) => field.onChange(urls[0] ?? "")}
                  maxImages={1}
                />
              )}
            />
          </div>
        </form>

        <SheetFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((d) => mutation.mutate(d))}
            disabled={mutation.isPending}
            className="bg-[var(--color-navy)] text-white"
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
