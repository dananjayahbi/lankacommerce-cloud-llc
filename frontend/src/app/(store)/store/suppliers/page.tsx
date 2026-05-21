"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Archive, Pencil, Phone, Mail, Building2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierSheet } from "@/components/suppliers/SupplierSheet";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { Supplier, SuppliersListResponse } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function SuppliersPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | undefined>(undefined);

  const { data, isLoading } = useQuery<SuppliersListResponse>({
    queryKey: ["suppliers", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`${API_BASE}/api/crm/suppliers/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load suppliers");
      return json.data;
    },
    placeholderData: (prev) => prev,
    enabled: !!accessToken && can(PERMISSIONS.SUPPLIERS_VIEW),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/crm/suppliers/${id}/archive/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to archive supplier");
      return json;
    },
    onSuccess: () => {
      toast.success("Supplier archived.");
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!can(PERMISSIONS.SUPPLIERS_VIEW)) {
    return (
      <div className="flex items-center justify-center h-64 text-[#64748B]">
        You do not have permission to view suppliers.
      </div>
    );
  }

  const suppliers = data?.results ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B3A] font-inter">Suppliers</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {data?.total ?? 0} supplier{(data?.total ?? 0) !== 1 ? "s" : ""} in your network
          </p>
        </div>
        {can(PERMISSIONS.SUPPLIERS_CREATE) && (
          <Button
            className="bg-[#F97316] hover:bg-[#ea6c0a] text-white"
            onClick={() => {
              setEditSupplier(undefined);
              setSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Search suppliers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-[#64748B] space-y-2">
          <Building2 className="h-10 w-10 opacity-30" />
          <p>No suppliers found.</p>
          {can(PERMISSIONS.SUPPLIERS_CREATE) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditSupplier(undefined);
                setSheetOpen(true);
              }}
            >
              Add your first supplier
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F1F5F9] text-[#64748B]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Supplier</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Lead Time</th>
                <th className="px-4 py-3 text-left font-medium">POs</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1B2B3A]">{s.name}</div>
                    {s.address && (
                      <div className="text-xs text-[#64748B] truncate max-w-[200px]">{s.address}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {s.contact_name || <span className="text-[#CBD5E1]">—</span>}
                    {s.email && (
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        <Mail className="h-3 w-3" />
                        {s.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[#64748B]">
                      <Phone className="h-3 w-3" />
                      {s.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[#64748B]">
                      <Clock className="h-3 w-3" />
                      {s.lead_time_days}d
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{s.purchase_orders_count}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        s.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }
                    >
                      {s.is_active ? "Active" : "Archived"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {can(PERMISSIONS.SUPPLIERS_EDIT) && s.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditSupplier(s);
                            setSheetOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {can(PERMISSIONS.SUPPLIERS_DELETE) && s.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => archiveMutation.mutate(s.id)}
                          disabled={archiveMutation.isPending}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SupplierSheet
        {...(editSupplier !== undefined ? { supplier: editSupplier } : {})}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={() => void queryClient.invalidateQueries({ queryKey: ["suppliers"] })}
      />
    </div>
  );
}
