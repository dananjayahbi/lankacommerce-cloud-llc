"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { StaffListResponse, StaffMember } from "@/types/hr";
import { StaffTable } from "./components/StaffTable";
import { CreateStaffModal } from "./components/CreateStaffModal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function StaffPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { can, role } = usePermissions();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);

  // Role guard — cashiers and stock clerks cannot access this page
  if (role === "CASHIER" || role === "STOCK_CLERK") {
    router.replace("/store/dashboard");
    return null;
  }

  const { data, isLoading, isError } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/hr/staff/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: StaffListResponse = await res.json();
      if (!res.ok) throw new Error("Failed to load staff");
      return json.data;
    },
    placeholderData: (prev) => prev,
    enabled: !!accessToken && can(PERMISSIONS.STAFF_VIEW),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/api/hr/staff/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to update status");
      return json.data as StaffMember;
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["staff"] });
      const previous = queryClient.getQueryData<StaffMember[]>(["staff"]);
      queryClient.setQueryData<StaffMember[]>(["staff"], (old) =>
        (old ?? []).map((m) => (m.id === id ? { ...m, is_active } : m))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["staff"], context.previous);
      }
      toast.error("Failed to update status.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const memberCount = data?.length ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy font-inter">Staff</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {isLoading ? "Loading…" : `${memberCount} member${memberCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        {can(PERMISSIONS.STAFF_CREATE) && (
          <Button
            className="bg-orange hover:bg-orange-600 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Staff Member
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load staff. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data && (
        <StaffTable
          staff={data}
          onToggleActive={(id, is_active) =>
            toggleActiveMutation.mutate({ id, is_active })
          }
        />
      )}

      <CreateStaffModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
