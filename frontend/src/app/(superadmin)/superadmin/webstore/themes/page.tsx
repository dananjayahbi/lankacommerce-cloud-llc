"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Palette,
  Plus,
  Eye,
  EyeOff,
  Users,
  Loader2,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTheme {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  version: string;
  version_number: number;
  is_free: boolean;
  price: string;
  is_published: boolean;
  tenant_count: number;
  created_at: string;
}

interface PaginatedThemes {
  results: AdminTheme[];
  count: number;
  next: string | null;
  previous: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminThemesPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, isLoading } = useQuery<PaginatedThemes>({
    queryKey: ["admin-themes", statusFilter, categoryFilter],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (categoryFilter !== "all") qs.set("category", categoryFilter);
      const res = await fetch(
        `${API_BASE}/api/webstore/admin/themes/?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load themes");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const togglePublishMutation = useMutation<void, Error, { id: string; publish: boolean }>({
    mutationFn: async ({ id, publish }) => {
      const action = publish ? "publish" : "unpublish";
      const res = await fetch(
        `${API_BASE}/api/webstore/admin/themes/${id}/${action}/`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Failed to ${action} theme`);
      }
    },
    onSuccess: (_, { publish }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-themes"] });
      toast.success(publish ? "Theme published." : "Theme unpublished.");
    },
    onError: (err) => toast.error(err.message),
  });

  const themes = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-6 h-6 text-[#F97316]" />
            Theme Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage marketplace themes available to merchants
          </p>
        </div>
        <Link href="/superadmin/webstore/themes/new">
          <Button className="bg-[#F97316] hover:bg-orange-600 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Theme
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {["GENERAL", "FASHION", "FOOD", "ELECTRONICS", "BEAUTY", "FURNITURE", "JEWELLERY"].map(
              (cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        {data && (
          <span className="text-xs text-slate-400 ml-auto">
            {data.count} theme{data.count !== 1 ? "s" : ""}
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
                <TableHead>Theme</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Installs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {themes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    No themes found. Create your first theme.
                  </TableCell>
                </TableRow>
              ) : (
                themes.map((theme) => (
                  <TableRow key={theme.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{theme.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{theme.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {theme.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          theme.is_published
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }
                        variant="outline"
                      >
                        {theme.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-slate-600">
                        {theme.version} <span className="text-slate-400">(#{theme.version_number})</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {theme.is_free ? (
                        <span className="text-xs text-emerald-600 font-medium">Free</span>
                      ) : (
                        <span className="text-xs text-slate-700">LKR {theme.price}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/superadmin/webstore/themes/${theme.id}?tab=tenants`}
                        className="flex items-center gap-1 text-sm text-slate-600 hover:text-[#F97316] transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {theme.tenant_count}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            togglePublishMutation.mutate({
                              id: theme.id,
                              publish: !theme.is_published,
                            })
                          }
                          disabled={togglePublishMutation.isPending}
                        >
                          {theme.is_published ? (
                            <><EyeOff className="w-3.5 h-3.5 mr-1" /> Unpublish</>
                          ) : (
                            <><Eye className="w-3.5 h-3.5 mr-1" /> Publish</>
                          )}
                        </Button>
                        <Link href={`/superadmin/webstore/themes/${theme.id}`}>
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
