"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  Check,
  Download,
  Eye,
  Filter,
  Loader2,
  Palette,
  X,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Theme {
  id: string;
  name: string;
  version: string;
  author: string;
  category: string;
  preview_image_url: string | null;
  is_free: boolean;
  is_installed: boolean;
  description: string;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

type PaidFilter = "all" | "free" | "paid";
type SortOption = "newest" | "popular" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  popular: "Most Popular",
  name: "Name (A–Z)",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ThemesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [confirmTheme, setConfirmTheme] = useState<Theme | null>(null);

  const { data: themes = [], isLoading } = useQuery<Theme[]>({
    queryKey: ["webstore-themes-all"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/themes/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load themes");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const installMutation = useMutation<void, Error, string>({
    mutationFn: async (themeId) => {
      const res = await fetch(
        `${API_BASE}/api/webstore/themes/${themeId}/install/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail ??
            "Failed to install theme",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-themes-all"] });
      queryClient.invalidateQueries({ queryKey: ["webstore-config"] });
      setConfirmTheme(null);
      toast.success("Theme installed! Redirecting to customizer…");
      router.push("/store/webstore/customize");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Derive available categories from loaded themes
  const categories = Array.from(
    new Set(themes.map((t) => t.category).filter(Boolean)),
  );

  // Filter + sort
  const filtered = themes
    .filter((t) => categoryFilter === "all" || t.category === categoryFilter)
    .filter(
      (t) =>
        paidFilter === "all" ||
        (paidFilter === "free" && t.is_free) ||
        (paidFilter === "paid" && !t.is_free),
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      // newest / popular: server already returns in the right order;
      // we can't sort client-side without timestamps, so preserve original order.
      return 0;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Palette className="w-6 h-6 text-[#F97316]" />
          Theme Marketplace
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Browse and install themes for your webstore
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          Filter:
        </div>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Free / Paid filter */}
        <div className="flex items-center rounded-md border bg-white">
          {(["all", "free", "paid"] as PaidFilter[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPaidFilter(v)}
              className={cn(
                "h-8 px-3 text-xs capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                paidFilter === v
                  ? "bg-[#F97316] text-white"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="ml-auto">
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as SortOption)}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <Palette className="mx-auto mb-3 w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-500">No themes match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onPreview={() => setPreviewTheme(theme)}
              onInstall={() => setConfirmTheme(theme)}
            />
          ))}
        </div>
      )}

      {/* Preview modal */}
      <ThemePreviewModal
        theme={previewTheme}
        onClose={() => setPreviewTheme(null)}
        onInstall={(t) => {
          setPreviewTheme(null);
          setConfirmTheme(t);
        }}
      />

      {/* Install confirmation dialog */}
      <InstallConfirmDialog
        theme={confirmTheme}
        isInstalling={installMutation.isPending}
        error={installMutation.error?.message ?? null}
        onConfirm={(t) => installMutation.mutate(t.id)}
        onClose={() => {
          setConfirmTheme(null);
          installMutation.reset();
        }}
      />
    </div>
  );
}

// ─── Theme Card ───────────────────────────────────────────────────────────────

function ThemeCard({
  theme,
  onPreview,
  onInstall,
}: {
  theme: Theme;
  onPreview: () => void;
  onInstall: () => void;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Preview image */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {theme.preview_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.preview_image_url}
            alt={theme.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Palette className="w-10 h-10 text-slate-300" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onPreview}
            className="h-8 text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Preview
          </Button>
          {!theme.is_installed && (
            <Button
              size="sm"
              onClick={onInstall}
              className="h-8 text-xs bg-[#F97316] hover:bg-orange-600 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Install
            </Button>
          )}
        </div>

        {/* Installed badge */}
        {theme.is_installed && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white text-[10px] gap-1">
              <Check className="w-3 h-3" />
              Installed
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{theme.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              v{theme.version} &middot; {theme.author}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              variant={theme.is_free ? "secondary" : "outline"}
              className="text-[10px]"
            >
              {theme.is_free ? "Free" : "Paid"}
            </Badge>
            {theme.category && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {theme.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onPreview}
          >
            Preview
          </Button>
          {theme.is_installed ? (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 h-8 text-xs"
              disabled
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Installed
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-[#F97316] hover:bg-orange-600 text-white"
              onClick={onInstall}
            >
              Install
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function ThemePreviewModal({
  theme,
  onClose,
  onInstall,
}: {
  theme: Theme | null;
  onClose: () => void;
  onInstall: (t: Theme) => void;
}) {
  if (!theme) return null;

  return (
    <Dialog open={!!theme} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {theme.name}
            <Badge variant="outline" className="text-xs">
              v{theme.version}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            By {theme.author} &middot;{" "}
            {theme.is_free ? "Free" : "Paid"} &middot; {theme.category}
          </DialogDescription>
        </DialogHeader>

        {/* Preview image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
          {theme.preview_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.preview_image_url}
              alt={theme.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Palette className="w-12 h-12 text-slate-300" />
            </div>
          )}
        </div>

        {theme.description && (
          <p className="text-sm text-slate-600">{theme.description}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!theme.is_installed && (
            <Button
              className="bg-[#F97316] hover:bg-orange-600 text-white"
              onClick={() => onInstall(theme)}
            >
              <Download className="w-4 h-4 mr-2" />
              Install Theme
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function InstallConfirmDialog({
  theme,
  isInstalling,
  error,
  onConfirm,
  onClose,
}: {
  theme: Theme | null;
  isInstalling: boolean;
  error: string | null;
  onConfirm: (t: Theme) => void;
  onClose: () => void;
}) {
  if (!theme) return null;

  return (
    <Dialog open={!!theme} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install "{theme.name}"?</DialogTitle>
          <DialogDescription>
            This will create a draft of <strong>{theme.name}</strong>. You can
            customize it before publishing. Your current live design will not be
            affected until you publish.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isInstalling}>
            Cancel
          </Button>
          <Button
            className="bg-[#F97316] hover:bg-orange-600 text-white"
            disabled={isInstalling}
            onClick={() => onConfirm(theme)}
          >
            {isInstalling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
