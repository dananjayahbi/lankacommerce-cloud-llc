"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Users,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ThemeForm from "../../_components/ThemeForm";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type TabId = "edit" | "tenants";

// ─── Theme detail ──────────────────────────────────────────────────────────────

interface AdminThemeDetail {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  version: string;
  version_number: number;
  author: string;
  is_free: boolean;
  price: string;
  is_published: boolean;
  is_default: boolean;
  preview_image_url: string;
  preview_images: unknown[];
  supported_sections: string[];
  global_settings_schema: unknown[];
  default_config: Record<string, unknown>;
  tenant_count: number;
}

interface TenantInstall {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  config_status: string;
  installed_at: string;
}

export default function ThemeDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const initialTab = (searchParams.get("tab") as TabId) ?? "edit";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [forceUpdateDialog, setForceUpdateDialog] = useState(false);

  const { data: theme, isLoading } = useQuery<AdminThemeDetail>({
    queryKey: ["admin-theme", params.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/themes/${params.id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load theme");
      return res.json();
    },
    enabled: !!accessToken && !!params.id,
  });

  const { data: blocksData } = useQuery<{ results: { id: string; type: string; name: string }[] }>({
    queryKey: ["admin-blocks-all"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/blocks/?page_size=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return { results: [] };
      return res.json();
    },
    enabled: !!accessToken,
  });

  const { data: tenantsData } = useQuery<{ results: TenantInstall[] }>({
    queryKey: ["admin-theme-tenants", params.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/themes/${params.id}/tenants/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load tenants");
      return res.json();
    },
    enabled: !!accessToken && !!params.id && activeTab === "tenants",
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/themes/${params.id}/`, {
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
      queryClient.invalidateQueries({ queryKey: ["admin-theme", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-themes"] });
      toast.success("Theme updated successfully.");
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" && err !== null && "detail" in err
          ? String((err as { detail: unknown }).detail)
          : "Failed to update theme.";
      toast.error(msg);
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const action = publish ? "publish" : "unpublish";
      const res = await fetch(`${API_BASE}/api/webstore/admin/themes/${params.id}/${action}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Failed to ${action}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-theme", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-themes"] });
      toast.success(theme?.is_published ? "Theme unpublished." : "Theme published.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const forceUpdateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/webstore/admin/themes/${params.id}/force-update-tenants/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirm: true }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Failed");
      return data;
    },
    onSuccess: (data) => {
      setForceUpdateDialog(false);
      toast.success((data as { detail: string }).detail);
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

  if (!theme) {
    return (
      <div className="text-center py-20 text-slate-400">Theme not found.</div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/webstore/themes" className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {theme.name}
              <Badge
                variant="outline"
                className={
                  theme.is_published
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600"
                }
              >
                {theme.is_published ? "Published" : "Draft"}
              </Badge>
            </h1>
            <p className="text-sm text-slate-500">
              v{theme.version} · revision #{theme.version_number} · {theme.tenant_count} install
              {theme.tenant_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {theme.is_published && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => setForceUpdateDialog(true)}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Force Update Tenants
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => togglePublishMutation.mutate(!theme.is_published)}
            disabled={togglePublishMutation.isPending}
          >
            {theme.is_published ? (
              <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
            ) : (
              <><Eye className="w-3.5 h-3.5" /> Publish</>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["edit", "tenants"] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-[#F97316] text-[#F97316]"
                : "border-transparent text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            {tab === "tenants" ? (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Tenants ({theme.tenant_count})
              </span>
            ) : (
              "Edit Theme"
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "edit" && (
        <ThemeForm
          initialData={{
            name: theme.name,
            slug: theme.slug,
            category: theme.category,
            description: theme.description,
            is_free: theme.is_free,
            price: theme.price,
            preview_image_url: theme.preview_image_url,
            preview_images: JSON.stringify(theme.preview_images, null, 2),
            supported_sections: theme.supported_sections,
            global_settings_schema: JSON.stringify(theme.global_settings_schema, null, 2),
            default_config: JSON.stringify(theme.default_config, null, 2),
            is_published: theme.is_published,
            version_number: theme.version_number,
          }}
          blocks={blocksData?.results ?? []}
          onSubmit={updateMutation.mutate}
          isPending={updateMutation.isPending}
          isEdit
        />
      )}

      {activeTab === "tenants" && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Tenant</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Config Status</TableHead>
                <TableHead>Installed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!tenantsData ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-300" />
                  </TableCell>
                </TableRow>
              ) : tenantsData.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                    No tenants have installed this theme yet.
                  </TableCell>
                </TableRow>
              ) : (
                tenantsData.results.map((install) => (
                  <TableRow key={install.tenant_id}>
                    <TableCell className="font-medium">{install.tenant_name}</TableCell>
                    <TableCell>
                      <code className="text-xs font-mono text-slate-500">{install.tenant_slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {install.config_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(install.installed_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Force Update Dialog */}
      <Dialog open={forceUpdateDialog} onOpenChange={setForceUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Force Update Tenant Configs
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              This will create a new <strong>DRAFT</strong> config (based on the theme&apos;s
              current <code className="font-mono text-xs">default_config</code>) for every tenant
              that has installed <strong>{theme.name}</strong>. Existing active configs are
              preserved. Any existing draft will be archived.
              <br />
              <br />
              <strong className="text-amber-700">This action is irreversible.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForceUpdateDialog(false)}
              disabled={forceUpdateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => forceUpdateMutation.mutate()}
              disabled={forceUpdateMutation.isPending}
            >
              {forceUpdateMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm Force Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
