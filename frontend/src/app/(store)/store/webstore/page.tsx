"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import {
  Globe,
  ExternalLink,
  Paintbrush,
  Package,
  ShoppingBag,
  Settings,
  Palette,
  Layers,
  Loader2,
  Power,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import MetricCard from "@/components/MetricCard";
import { WebstoreSetupWizard } from "@/components/webstore/admin/WebstoreSetupWizard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface ActiveTheme {
  id: string;
  theme_name: string;
  theme_version: string;
  preview_image_url: string | null;
}

interface WebstoreConfig {
  id: string;
  slug: string;
  is_enabled: boolean;
  seo_title: string;
  seo_description: string;
  storefront_domain: string | null;
  active_theme: ActiveTheme | null;
}

interface WebstoreStats {
  orders_last_30_days: number;
  revenue_last_30_days: number;
  active_collections: number;
  published_pages: number;
}

function formatLKR(value: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function WebstoreHubPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading: configLoading,
    isError: configError,
  } = useQuery<WebstoreConfig | null>({
    queryKey: ["webstore-config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/config/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load webstore config");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const { data: stats } = useQuery<WebstoreStats>({
    queryKey: ["webstore-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/stats/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return { orders_last_30_days: 0, revenue_last_30_days: 0, active_collections: 0, published_pages: 0 };
      return res.json();
    },
    enabled: !!accessToken && !!config,
  });

  const toggleMutation = useMutation<void, Error, boolean>({
    mutationFn: async (enabled) => {
      const res = await fetch(`${API_BASE}/api/webstore/config/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_enabled: enabled }),
      });
      if (!res.ok) throw new Error("Failed to update webstore status");
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["webstore-config"] });
      toast.success(enabled ? "Webstore is now live" : "Webstore is now offline");
    },
    onError: (err) => toast.error(err.message),
  });

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Failed to load webstore data.</p>
      </div>
    );
  }

  // First-time setup
  if (config === null) {
    return (
      <WebstoreSetupWizard tenantName={user?.email?.split("@")[0]} />
    );
  }

  const storefrontUrl = config.storefront_domain
    ? `https://${config.storefront_domain}/`
    : `https://${config.slug}.lankacommerce.com/`;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Webstore</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your online storefront
        </p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              config.is_enabled ? "bg-green-50" : "bg-slate-100"
            }`}
          >
            <Globe
              className={`w-5 h-5 ${config.is_enabled ? "text-green-600" : "text-slate-400"}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {config.seo_title || "Your Webstore"}
              </span>
              <Badge
                variant={config.is_enabled ? "success" : "secondary"}
                className={config.is_enabled ? "" : ""}
              >
                {config.is_enabled ? "Live" : "Offline"}
              </Badge>
            </div>
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#F97316] hover:underline flex items-center gap-1 mt-0.5"
            >
              {storefrontUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {config.is_enabled ? "Disable" : "Enable"} webstore
          </span>
          <Switch
            checked={config.is_enabled}
            disabled={toggleMutation.isPending}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Orders (30 days)"
          value={stats?.orders_last_30_days ?? "—"}
          icon={ShoppingBag}
        />
        <MetricCard
          label="Revenue (30 days)"
          value={stats ? formatLKR(stats.revenue_last_30_days) : "—"}
          icon={Globe}
        />
        <MetricCard
          label="Active Collections"
          value={stats?.active_collections ?? "—"}
          icon={Layers}
        />
        <MetricCard
          label="Published Pages"
          value={stats?.published_pages ?? "—"}
          icon={Package}
          accentColour="amber"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Visual Customizer",
              icon: Paintbrush,
              href: "/store/webstore/customize",
            },
            {
              label: "Manage Products",
              icon: Package,
              href: "/store/inventory",
            },
            {
              label: "View Orders",
              icon: ShoppingBag,
              href: "/store/webstore/orders",
            },
            {
              label: "Store Settings",
              icon: Settings,
              href: "/store/webstore/settings",
            },
          ].map(({ label, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 hover:border-orange-300 hover:shadow-sm transition-all text-center"
            >
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#F97316]" />
              </div>
              <span className="text-xs font-medium text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Active theme card */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Active Theme
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-4">
          <div className="w-20 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0">
            {config.active_theme?.preview_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.active_theme.preview_image_url}
                alt={config.active_theme.theme_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Palette className="w-6 h-6 text-slate-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">
              {config.active_theme?.theme_name ?? "No theme installed"}
            </p>
            {config.active_theme && (
              <p className="text-xs text-slate-400 mt-0.5">
                v{config.active_theme.theme_version}
              </p>
            )}
            <div className="flex gap-3 mt-3">
              <Link href="/store/webstore/themes">
                <Button variant="outline" size="sm">
                  Change Theme
                </Button>
              </Link>
              <Link href="/store/webstore/customize">
                <Button
                  size="sm"
                  className="bg-[#F97316] hover:bg-orange-600 text-white"
                >
                  Edit Live Design
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
