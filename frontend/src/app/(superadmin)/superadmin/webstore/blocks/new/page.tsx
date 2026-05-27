"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import BlockForm from "../../_components/BlockForm";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function NewBlockPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/blocks/`, {
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
      toast.success("Block created successfully.");
      router.push(`/superadmin/webstore/blocks/${data.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" && err !== null && "detail" in err
          ? String((err as { detail: unknown }).detail)
          : "Failed to create block. Check the form for errors.";
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/webstore/blocks"
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-[#F97316]" />
            New Block Definition
          </h1>
          <p className="text-sm text-slate-500">Create a reusable block for the theme customizer</p>
        </div>
      </div>

      <BlockForm
        onSubmit={createMutation.mutate}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
