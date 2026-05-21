"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PromotionsTable } from "./components/PromotionsTable";
import { PromotionForm } from "./components/PromotionForm";
import type { Promotion, PromotionFormValues } from "@/types/promotions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function buildPayload(data: PromotionFormValues) {
  return {
    name: data.name,
    type: data.type,
    value: data.value,
    promo_code: data.promo_code || null,
    target_category: data.target_category_id || null,
    min_quantity: data.min_quantity ? parseInt(data.min_quantity, 10) : null,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    is_active: data.is_active,
    description: data.description || "",
  };
}

export default function PromotionsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isManagerOrAbove } = usePermissions();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editPromotion, setEditPromotion] = useState<Promotion | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  if (!isManagerOrAbove) {
    router.replace("/dashboard");
    return null;
  }

  const { data, isLoading, isError } = useQuery<Promotion[]>({
    queryKey: ["promotions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/promotions/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromotionFormValues) => {
      // Client-side promo code uniqueness check
      if (data.type === "PROMO_CODE" && data.promo_code) {
        const cached = queryClient.getQueryData<Promotion[]>(["promotions"]);
        const exists = cached?.some(
          (p) => p.promo_code?.toLowerCase() === data.promo_code.toLowerCase()
        );
        if (exists) {
          throw new Error("DUPLICATE_CODE");
        }
      }
      const res = await fetch(`${API_BASE}/api/promotions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildPayload(data)),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw json;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setCreateOpen(false);
      toast.success("Promotion created successfully.");
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "DUPLICATE_CODE") {
        toast.error("This promo code already exists for your store.");
        return;
      }
      toast.error("Failed to create promotion.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PromotionFormValues }) => {
      const res = await fetch(`${API_BASE}/api/promotions/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildPayload(data)),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setEditPromotion(null);
      toast.success("Promotion updated.");
    },
    onError: () => {
      toast.error("Failed to update promotion.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/promotions/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setDeleteAlertOpen(false);
      setEditPromotion(null);
      toast.success("Promotion deleted.");
    },
    onError: () => {
      toast.error("Failed to delete promotion.");
    },
  });

  const activeCount = data?.filter((p) => p.is_active).length ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Promotions</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>
            {activeCount} active promotion{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          className="text-white"
          style={{ backgroundColor: "#F97316" }}
          onClick={() => setCreateOpen(true)}
        >
          New Promotion
        </Button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load promotions. Please try again.
          </AlertDescription>
        </Alert>
      )}
      {data && (
        <PromotionsTable
          promotions={data}
          onEdit={(p) => setEditPromotion(p)}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Promotion</DialogTitle>
          </DialogHeader>
          <PromotionForm
            onSubmit={(data) => createMutation.mutate(data)}
            isSubmitting={createMutation.isPending}
            submitLabel="Create Promotion"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!editPromotion} onOpenChange={(open) => !open && setEditPromotion(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Promotion</SheetTitle>
          </SheetHeader>
          {editPromotion && (
            <div className="mt-4 space-y-4">
              <PromotionForm
                defaultValues={{
                  name: editPromotion.name,
                  type: editPromotion.type,
                  value: editPromotion.value,
                  promo_code: editPromotion.promo_code ?? "",
                  target_category_id: editPromotion.target_category_id ?? "",
                  min_quantity: editPromotion.min_quantity?.toString() ?? "",
                  starts_at: editPromotion.starts_at
                    ? editPromotion.starts_at.slice(0, 16)
                    : "",
                  ends_at: editPromotion.ends_at
                    ? editPromotion.ends_at.slice(0, 16)
                    : "",
                  is_active: editPromotion.is_active,
                  description: editPromotion.description,
                }}
                onSubmit={(data) =>
                  updateMutation.mutate({ id: editPromotion.id, data })
                }
                isSubmitting={updateMutation.isPending}
                submitLabel="Save Changes"
                isEditMode={true}
              />

              <hr />

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteAlertOpen(true)}
              >
                Delete Promotion
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This promotion will be deactivated and archived. Existing sales
              using this promotion code are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editPromotion && deleteMutation.mutate(editPromotion.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
