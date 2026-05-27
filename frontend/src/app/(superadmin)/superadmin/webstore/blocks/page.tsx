"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutTemplate, Plus, Eye, EyeOff, Loader2 } from "lucide-react";
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
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface AdminBlock {
  id: string;
  type: string;
  name: string;
  description: string;
  react_component_key: string;
  is_published: boolean;
  is_premium: boolean;
  version: string;
  schema: unknown[];
}

interface PaginatedBlocks {
  results: AdminBlock[];
  count: number;
}

export default function AdminBlocksPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery<PaginatedBlocks>({
    queryKey: ["admin-blocks", statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const res = await fetch(
        `${API_BASE}/api/webstore/admin/blocks/?${qs.toString()}&page_size=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load blocks");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const publishMutation = useMutation<void, Error, string>({
    mutationFn: async (blockId) => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/blocks/${blockId}/publish/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Failed to publish block");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocks"] });
      toast.success("Block published.");
    },
    onError: (err) => toast.error(err.message),
  });

  const blocks = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-[#F97316]" />
            Block Definitions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Define reusable UI blocks available in the theme customizer
          </p>
        </div>
        <Link href="/superadmin/webstore/blocks/new">
          <Button className="bg-[#F97316] hover:bg-orange-600 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Block
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>
          </SelectContent>
        </Select>
        {data && (
          <span className="text-xs text-slate-400 ml-auto">
            {data.count} block{data.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Component Key</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    No blocks found. Create your first block definition.
                  </TableCell>
                </TableRow>
              ) : (
                blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell>
                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        {block.type}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{block.name}</TableCell>
                    <TableCell>
                      <code className="text-xs font-mono text-slate-500">
                        {block.react_component_key}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {Array.isArray(block.schema) ? block.schema.length : 0} settings
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {!block.is_published && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => publishMutation.mutate(block.id)}
                            disabled={publishMutation.isPending}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Publish
                          </Button>
                        )}
                        <Link href={`/superadmin/webstore/blocks/${block.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
