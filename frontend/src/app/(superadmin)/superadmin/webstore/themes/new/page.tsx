"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Palette } from "lucide-react";
import Link from "next/link";
import ThemeForm from "../../_components/ThemeForm";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function NewThemePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: blocksData } = useQuery<{ results: { id: string; type: string; name: string }[] }>({
    queryKey: ["admin-blocks-all"],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/webstore/admin/blocks/?page_size=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load blocks");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/themes/`, {
        method: "POST",
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
    onSuccess: (data) => {
      toast.success("Theme created successfully.");
      router.push(`/superadmin/webstore/themes/${data.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" && err !== null && "detail" in err
          ? String((err as { detail: unknown }).detail)
          : "Failed to create theme. Check the form for errors.";
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/webstore/themes"
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#F97316]" />
            New Theme
          </h1>
          <p className="text-sm text-slate-500">Create a new marketplace theme</p>
        </div>
      </div>

      <ThemeForm
        blocks={blocksData?.results ?? []}
        onSubmit={createMutation.mutate}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
