"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/authStore";
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "@/types/expenses";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, "Amount must be greater than zero"),
  description: z.string().min(1, "Description is required").max(1000),
  expense_date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  queryKey: readonly unknown[];
}

export function CreateExpenseModal({ open, onClose, onSuccess, queryKey }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedObjectUrl, setUploadedObjectUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().split("T")[0] ?? "";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      category: "",
      amount: "",
      description: "",
      expense_date: today,
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ category: "", amount: "", description: "", expense_date: today });
      setUploadedObjectUrl(null);
      setUploadError(null);
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [open, reset, today]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadedObjectUrl(null);
    setUploadProgress(0);

    // Simulate progress animation
    let progress = 0;
    const step = () => {
      progress = Math.min(progress + 10, 90);
      setUploadProgress(progress);
      if (progress < 90) {
        progressTimerRef.current = setTimeout(step, 200);
      }
    };
    progressTimerRef.current = setTimeout(step, 200);

    try {
      const params = new URLSearchParams({
        file_name: file.name,
        mime_type: file.type,
      });
      const urlRes = await fetch(`${API_BASE}/api/pos/expenses/upload-url/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!urlRes.ok) {
        throw new Error("Failed to get upload URL");
      }
      const urlJson = await urlRes.json() as { success: boolean; data: { upload_url: string; object_url: string } };
      const { upload_url, object_url } = urlJson.data;

      const putRes = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) throw new Error("Upload failed");

      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      setUploadProgress(100);
      setUploadedObjectUrl(object_url);
    } catch {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      setUploadError("Receipt upload failed. You can still save the expense without a receipt.");
      setUploadedObjectUrl(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        category: values.category,
        amount: values.amount,
        description: values.description,
        expense_date: values.expense_date,
      };
      if (uploadedObjectUrl) {
        body.receipt_image_url = uploadedObjectUrl;
      }
      const res = await fetch(`${API_BASE}/api/pos/expenses/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: { message?: string } };
        toast.error(err.error?.message ?? "Failed to record expense");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: [queryKey[0]] });
      toast.success("Expense recorded.");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to record expense");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.category.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount (Rs.)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.amount.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} placeholder="Enter description…" {...register("description")} />
            {errors.description && (
              <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.description.message}</p>
            )}
          </div>

          {/* Expense Date */}
          <div className="space-y-1.5">
            <Label>Expense Date</Label>
            <Input type="date" {...register("expense_date")} />
            {errors.expense_date && (
              <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.expense_date.message}</p>
            )}
          </div>

          {/* Receipt Upload */}
          <div className="space-y-1.5">
            <Label>Receipt Image (optional)</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="font-inter text-[12px]" style={{ color: "#64748B" }}>Uploading…</p>
              </div>
            )}
            {uploadedObjectUrl && !isUploading && (
              <div className="space-y-1">
                <img
                  src={uploadedObjectUrl}
                  alt="Receipt preview"
                  style={{ maxHeight: 120, objectFit: "contain" }}
                  className="rounded border border-border"
                />
                <p className="font-inter text-[12px]" style={{ color: "#22C55E" }}>Receipt uploaded.</p>
              </div>
            )}
            {uploadError && (
              <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{uploadError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              style={{ backgroundColor: "#F97316" }}
              className="text-white font-semibold"
            >
              {isSubmitting ? "Saving…" : "Record Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
