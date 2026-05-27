"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 25;

type ReviewStatus = "pending" | "approved" | "rejected" | "all";

interface ProductReview {
  id: string;
  product_title: string;
  product_handle: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function statusBadge(status: "pending" | "approved" | "rejected") {
  const map: Record<typeof status, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };
  const { label, className } = map[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

export default function ReviewsAdminPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("pending");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ProductReview | null>(null);

  const { data, isLoading } = useQuery<{
    count: number;
    results: ProductReview[];
  }>({
    queryKey: ["admin-reviews", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(
        `${API_BASE}/api/webstore/tenants/reviews/?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const reviews = data?.results ?? [];
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE}/api/webstore/tenants/reviews/${id}/approve/`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Review approved.");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error("Failed to approve review."),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE}/api/webstore/tenants/reviews/${id}/reject/`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Review rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error("Failed to reject review."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE}/api/webstore/tenants/reviews/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast.success("Review deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error("Failed to delete review."),
  });

  const isPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#F97316]" />
            Product Reviews
          </h1>
          <p className="text-sm text-slate-500">
            Moderate customer reviews for your products
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as ReviewStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All Reviews</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Product</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                </TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-400"
                >
                  No{" "}
                  {statusFilter !== "all" ? statusFilter + " " : ""}
                  reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id} className="hover:bg-slate-50 align-top">
                  <TableCell>
                    <span className="font-medium text-sm text-slate-800">
                      {review.product_title}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium text-slate-700">
                      {review.reviewer_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {review.reviewer_email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {review.rating}/5
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {review.title && (
                      <p className="font-medium text-sm text-slate-800 mb-0.5">
                        {review.title}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {review.body}
                    </p>
                  </TableCell>
                  <TableCell>{statusBadge(review.status)}</TableCell>
                  <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                    {format(new Date(review.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {review.status !== "approved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => approveMutation.mutate(review.id)}
                          disabled={isPending}
                          title="Approve review"
                          className="text-green-600 hover:text-green-800 hover:bg-green-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      {review.status !== "rejected" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rejectMutation.mutate(review.id)}
                          disabled={isPending}
                          title="Reject review"
                          className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(review)}
                        disabled={isPending}
                        title="Delete review"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} ({data?.count ?? 0} reviews)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this review by &quot;
              {deleteTarget?.reviewer_name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
