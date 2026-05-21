"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { LockIcon, PlusIcon, Loader2Icon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StockTakeSession, Category } from "@/types/catalog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: StockTakeSession["status"] }) {
  const styles: Record<string, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    PENDING_APPROVAL: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-slate-100 text-slate-500",
  };
  const labels: Record<string, string> = {
    IN_PROGRESS: "In Progress",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status === "IN_PROGRESS" && (
        <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {labels[status] ?? status}
    </span>
  );
}

function PermissionDenied() {
  return (
    <div className="rounded-xl border border-border bg-white p-8 text-center">
      <LockIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-[#1B2B3A]">Access Restricted</h2>
      <p className="mt-1 text-sm text-[#64748B]">You don't have permission to access stock takes.</p>
      <Link href="/stock-control" className="mt-4 inline-block text-sm font-medium text-[#F97316] hover:underline">
        ← Back to Stock Control
      </Link>
    </div>
  );
}

export default function StockTakesPage() {
  const { can, canAny } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "category">("all");
  const [categoryId, setCategoryId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["stock-takes-list"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const json = await res.json();
      return json.data as { sessions: StockTakeSession[]; total: number };
    },
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/categories/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      return json.data as Category[];
    },
    enabled: dialogOpen && !!accessToken,
    staleTime: 60_000,
  });

  const { mutate: startSession, isPending: starting } = useMutation({
    mutationFn: async () => {
      const body: Record<string, string | null> = {
        category_id: scope === "category" ? categoryId || null : null,
      };
      const res = await fetch(`${API_BASE}/api/catalog/stock-takes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        const err = await res.json();
        if (err?.error?.code === "SESSION_ALREADY_IN_PROGRESS") {
          router.push(`/stock-control/stock-takes/${err.error.existing_session_id}`);
          return null;
        }
      }
      if (!res.ok) throw new Error("Failed to start session");
      return res.json();
    },
    onSuccess: (data) => {
      if (!data) return;
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["stock-takes-list"] });
      router.push(`/stock-control/stock-takes/${data.data.id}`);
    },
    onError: () => {
      toast.error("Failed to start stock take. Please try again.");
      setDialogOpen(false);
    },
  });

  if (!canAny([PERMISSIONS.STOCK_TAKE_MANAGE, PERMISSIONS.STOCK_TAKE_APPROVE])) {
    return (
      <main className="bg-[#F1F5F9] min-h-screen p-6">
        <PermissionDenied />
      </main>
    );
  }

  const sessions = data?.sessions ?? [];
  const hasInProgress = sessions.some((s) => s.status === "IN_PROGRESS");

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-[#64748B]">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">›</span>
        <Link href="/stock-control" className="hover:underline">Stock Control</Link>
        <span className="mx-1">›</span>
        <span className="font-medium text-[#1B2B3A]">Stock Takes</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B3A]">Stock Takes</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Manage physical inventory counts and apply stock corrections.
          </p>
        </div>
        {can(PERMISSIONS.STOCK_TAKE_MANAGE) && (
          <div title={hasInProgress ? "A stock take is already in progress. Resume or complete it before starting a new one." : undefined}>
            <Button
              className="bg-[#1B2B3A] hover:bg-[#1B2B3A]/90 shrink-0"
              disabled={hasInProgress}
              onClick={() => setDialogOpen(true)}
            >
              <PlusIcon className="mr-2 size-4" /> Start New Stock Take
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left">
              <th className="px-4 py-3 font-medium text-[#64748B]">Status</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Scope</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Initiated By</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Started</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Items</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Discrepancies</th>
              <th className="px-4 py-3 font-medium text-[#64748B]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              : sessions.length === 0
                ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="py-12 text-center">
                        <p className="text-base font-semibold text-[#1B2B3A]">No stock takes yet</p>
                        <p className="mt-1 text-sm text-[#64748B]">
                          Start your first stock take to reconcile your physical inventory with the system record.
                        </p>
                      </div>
                    </td>
                  </tr>
                )
                : sessions.map((s) => (
                  <tr key={s.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-[#1B2B3A]">{s.category_name ?? "All Products"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.initiated_by_name}</td>
                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{fmtDate(s.started_at)}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.item_count.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {s.status === "IN_PROGRESS"
                        ? <span className="text-[#64748B]">—</span>
                        : s.discrepancy_count != null
                          ? (
                            <span className={s.discrepancy_count > 0 ? "text-amber-600 font-medium" : "text-[#64748B]"}>
                              {s.discrepancy_count}
                            </span>
                          )
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "IN_PROGRESS" && (
                        <Link
                          href={`/stock-control/stock-takes/${s.id}`}
                          className="text-sm font-medium text-[#1B2B3A] hover:underline"
                        >
                          Resume
                        </Link>
                      )}
                      {s.status === "PENDING_APPROVAL" && (
                        <Link
                          href={`/stock-control/stock-takes/${s.id}/review`}
                          className="text-sm font-medium text-amber-600 hover:underline"
                        >
                          Review
                        </Link>
                      )}
                      {(s.status === "APPROVED" || s.status === "REJECTED") && (
                        <Link
                          href={`/stock-control/stock-takes/${s.id}/review`}
                          className="text-sm font-medium text-[#64748B] hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* New session dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Stock Take</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Scope radio */}
            <div className="space-y-2">
              {(["all", "category"] as const).map((opt) => (
                <label key={opt} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E2E8F0] p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    className="mt-0.5 accent-[#1B2B3A]"
                    checked={scope === opt}
                    onChange={() => { setScope(opt); setCategoryId(""); }}
                  />
                  <div>
                    <p className="font-medium text-[#1B2B3A]">
                      {opt === "all" ? "All Products (Full Catalog)" : "Specific Category"}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {opt === "all"
                        ? "Session will include every variant in the tenant."
                        : "Select a category to count only those products."}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Category dropdown */}
            {scope === "category" && (
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent>
                  {(categoriesData ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                disabled={starting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#1B2B3A] hover:bg-[#1B2B3A]/90"
                disabled={starting || (scope === "category" && !categoryId)}
                onClick={() => startSession()}
              >
                {starting ? (
                  <><Loader2Icon className="mr-2 size-4 animate-spin" /> Starting…</>
                ) : (
                  "Start Session"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
