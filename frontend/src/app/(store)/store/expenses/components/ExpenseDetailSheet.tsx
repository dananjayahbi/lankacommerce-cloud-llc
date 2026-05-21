"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Decimal from "decimal.js";
import { ExternalLink, Pencil, X } from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import { type Expense, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "@/types/expenses";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

const editSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, "Amount must be greater than zero"),
  description: z.string().min(1, "Description is required").max(1000),
  expense_date: z.string().min(1, "Date is required"),
});

type EditFormValues = z.infer<typeof editSchema>;

interface Props {
  expense: Expense | null;
  onClose: () => void;
  queryKey: readonly unknown[];
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function ExpenseDetailSheet({ expense, onClose, queryKey }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt replace state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newReceiptUrl, setNewReceiptUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showReplaceUpload, setShowReplaceUpload] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: standardSchemaResolver(editSchema),
  });

  useEffect(() => {
    if (expense && isEditMode) {
      reset({
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        expense_date: expense.expense_date,
      });
      setNewReceiptUrl(null);
      setUploadError(null);
      setShowReplaceUpload(false);
    }
  }, [expense, isEditMode, reset]);

  useEffect(() => {
    if (!expense) setIsEditMode(false);
  }, [expense]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setNewReceiptUrl(null);
    setUploadProgress(0);

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
      const params = new URLSearchParams({ file_name: file.name, mime_type: file.type });
      const urlRes = await fetch(`${API_BASE}/api/pos/expenses/upload-url/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const urlJson = await urlRes.json() as { success: boolean; data: { upload_url: string; object_url: string } };
      const { upload_url, object_url } = urlJson.data;
      const putRes = await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("Upload failed");
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      setUploadProgress(100);
      setNewReceiptUrl(object_url);
    } catch {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      setUploadError("Receipt upload failed.");
      setNewReceiptUrl(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function onSubmit(values: EditFormValues) {
    if (!expense) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        category: values.category,
        amount: values.amount,
        description: values.description,
        expense_date: values.expense_date,
      };
      if (newReceiptUrl) body.receipt_image_url = newReceiptUrl;

      const res = await fetch(`${API_BASE}/api/pos/expenses/${expense.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: { message?: string } };
        toast.error(err.error?.message ?? "Failed to update expense");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: [queryKey[0]] });
      toast.success("Expense updated.");
      setIsEditMode(false);
    } catch {
      toast.error("Failed to update expense");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={expense !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Expense Detail</SheetTitle>
            {!isEditMode ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="gap-1"
              >
                <Pencil size={14} />
                Edit
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(false)}
                className="gap-1"
              >
                <X size={14} />
                Cancel
              </Button>
            )}
          </div>
        </SheetHeader>

        {expense && !isEditMode && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-inter text-[12px] font-medium" style={{ color: "#64748B" }}>Date</p>
                <p className="font-inter text-[14px]" style={{ color: "#1B2B3A" }}>{formatDate(expense.expense_date)}</p>
              </div>
              <div>
                <p className="font-inter text-[12px] font-medium" style={{ color: "#64748B" }}>Category</p>
                <p className="font-inter text-[14px]" style={{ color: "#1B2B3A" }}>{EXPENSE_CATEGORY_LABELS[expense.category]}</p>
              </div>
              <div>
                <p className="font-inter text-[12px] font-medium" style={{ color: "#64748B" }}>Amount</p>
                <p className="font-mono text-[16px] font-bold" style={{ color: "#1B2B3A" }}>
                  Rs. {new Decimal(expense.amount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="font-inter text-[12px] font-medium" style={{ color: "#64748B" }}>Recorded By</p>
                <p className="font-inter text-[14px]" style={{ color: "#1B2B3A" }}>{expense.recorded_by.name}</p>
              </div>
            </div>

            <div>
              <p className="font-inter text-[12px] font-medium" style={{ color: "#64748B" }}>Description</p>
              <p className="mt-1 font-inter text-[14px]" style={{ color: "#1B2B3A" }}>{expense.description}</p>
            </div>

            {expense.receipt_image_url && (
              <div>
                <p className="mb-2 font-inter text-[12px] font-medium" style={{ color: "#64748B" }}>Receipt</p>
                <img
                  src={expense.receipt_image_url}
                  alt="Receipt"
                  style={{ maxHeight: 200, objectFit: "contain" }}
                  className="mb-2 rounded border border-border"
                />
                <a
                  href={expense.receipt_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-inter text-[12px] underline"
                  style={{ color: "#1B2B3A" }}
                >
                  <ExternalLink size={12} />
                  View Full Size
                </a>
              </div>
            )}
          </div>
        )}

        {expense && isEditMode && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
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
              {errors.category && <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Amount (Rs.)</Label>
              <Input type="number" step="0.01" min="0.01" {...register("amount")} />
              {errors.amount && <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} {...register("description")} />
              {errors.description && <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Expense Date</Label>
              <Input type="date" {...register("expense_date")} />
              {errors.expense_date && <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{errors.expense_date.message}</p>}
            </div>

            {/* Receipt */}
            <div className="space-y-2">
              <Label>Receipt</Label>
              {!showReplaceUpload && expense.receipt_image_url && (
                <div className="flex items-center gap-2">
                  <a
                    href={expense.receipt_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-inter text-[12px] underline"
                    style={{ color: "#1B2B3A" }}
                  >
                    Current Receipt
                  </a>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowReplaceUpload(true)}>
                    Replace Receipt
                  </Button>
                </div>
              )}
              {(showReplaceUpload || !expense.receipt_image_url) && (
                <div className="space-y-1">
                  <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={isUploading} />
                  {isUploading && (
                    <div className="space-y-1">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="font-inter text-[12px]" style={{ color: "#64748B" }}>Uploading…</p>
                    </div>
                  )}
                  {newReceiptUrl && !isUploading && (
                    <p className="font-inter text-[12px]" style={{ color: "#22C55E" }}>Receipt uploaded.</p>
                  )}
                  {uploadError && (
                    <p className="font-inter text-[12px]" style={{ color: "#EF4444" }}>{uploadError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
                style={{ backgroundColor: "#F97316" }}
                className="text-white font-semibold"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
