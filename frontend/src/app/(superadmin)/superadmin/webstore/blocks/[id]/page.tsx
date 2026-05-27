"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, LayoutTemplate, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BlockForm from "../../_components/BlockForm";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface AdminBlockDetail {
  id: string;
  type: string;
  name: string;
  description: string;
  react_component_key: string;
  schema: unknown[];
  is_premium: boolean;
  is_published: boolean;
  version: string;
}

export default function BlockDetailPage() {
  const params = useParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: block, isLoading } = useQuery<AdminBlockDetail>({
    queryKey: ["admin-block", params.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/blocks/${params.id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load block");
      return res.json();
    },
    enabled: !!accessToken && !!params.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/blocks/${params.id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-block", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-blocks"] });
      toast.success("Block updated successfully.");
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" && err !== null && "detail" in err
          ? String((err as { detail: unknown }).detail)
          : "Failed to update block.";
      toast.error(msg);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/blocks/${params.id}/publish/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Failed to publish");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-block", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-blocks"] });
      toast.success("Block published.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!block) {
    return <div className="text-center py-20 text-slate-400">Block not found.</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/webstore/blocks" className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-[#F97316]" />
              {block.name}
              <Badge
                variant="outline"
                className={
                  block.is_published
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600"
                }
              >
                {block.is_published ? "Published" : "Draft"}
              </Badge>
            </h1>
            <p className="text-sm text-slate-500">
              <code className="font-mono text-xs">{block.type}</code> · v{block.version}
            </p>
          </div>
        </div>
        {!block.is_published && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            Publish
          </Button>
        )}
      </div>

      <BlockForm
        initialData={{
          type: block.type,
          name: block.name,
          description: block.description,
          react_component_key: block.react_component_key,
          schema: JSON.stringify(block.schema, null, 2),
          is_premium: block.is_premium,
          is_published: block.is_published,
        }}
        onSubmit={updateMutation.mutate}
        isPending={updateMutation.isPending}
        isEdit
      />
    </div>
  );
}
