"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface VariantPatchPayload {
  variantId: string;
  productId: string;
  data: Record<string, unknown>;
}

export function useVariantMutation() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ variantId, data }: VariantPatchPayload) => {
      const res = await fetch(`${API_BASE}/api/catalog/variants/${variantId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to update variant");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products", variables.productId] });
      toast.success("Variant updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
