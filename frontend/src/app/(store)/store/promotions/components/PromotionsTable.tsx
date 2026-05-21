"use client";

import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { Promotion, PromotionType } from "@/types/promotions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  CART_PERCENTAGE: "Cart % Off",
  CART_FIXED: "Cart Fixed Off",
  CATEGORY_PERCENTAGE: "Category % Off",
  BOGO: "Buy One Get One",
  MIX_AND_MATCH: "Mix & Match",
  PROMO_CODE: "Promo Code",
};

export const PROMOTION_TYPE_BADGE_CONFIG: Record<
  PromotionType,
  { bg: string; text: string }
> = {
  CART_PERCENTAGE: { bg: "#E2E8F0", text: "#1B2B3A" },
  CART_FIXED: { bg: "#E2E8F0", text: "#1B2B3A" },
  CATEGORY_PERCENTAGE: { bg: "#64748B", text: "#FFFFFF" },
  BOGO: { bg: "#F97316", text: "#FFFFFF" },
  MIX_AND_MATCH: { bg: "#F97316", text: "#FFFFFF" },
  PROMO_CODE: { bg: "#1B2B3A", text: "#FFFFFF" },
};

function formatValue(p: Promotion): string {
  if (p.type === "CART_PERCENTAGE" || p.type === "CATEGORY_PERCENTAGE") {
    return `${p.value}%`;
  }
  if (p.type === "CART_FIXED") {
    return `Rs. ${parseFloat(p.value).toFixed(2)}`;
  }
  if (p.type === "BOGO" || p.type === "MIX_AND_MATCH") {
    return `Buy ${p.min_quantity ?? 2} get 1`;
  }
  return p.value;
}

function formatValidWindow(p: Promotion): React.ReactNode {
  const fmt = (d: string) => format(new Date(d), "dd/MM/yyyy");
  if (p.starts_at && p.ends_at) {
    return `${fmt(p.starts_at)} – ${fmt(p.ends_at)}`;
  }
  if (p.starts_at) {
    return `From ${fmt(p.starts_at)}`;
  }
  if (p.ends_at) {
    return `Until ${fmt(p.ends_at)}`;
  }
  return <span style={{ color: "#64748B" }}>Always active</span>;
}

interface Props {
  promotions: Promotion[];
  onEdit: (p: Promotion) => void;
}

export function PromotionsTable({ promotions, onEdit }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`${API_BASE}/api/promotions/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["promotions"] });
      const previous = queryClient.getQueryData<Promotion[]>(["promotions"]);
      queryClient.setQueryData<Promotion[]>(["promotions"], (old) =>
        old?.map((p) => (p.id === id ? { ...p, is_active } : p))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["promotions"], context?.previous);
      toast.error("Failed to update promotion status.");
    },
  });

  const sorted = [...promotions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Promo Code</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Valid Window</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => {
          const badge = PROMOTION_TYPE_BADGE_CONFIG[p.type];
          const name = p.name.length > 40 ? p.name.slice(0, 37) + "…" : p.name;
          return (
            <TableRow key={p.id}>
              <TableCell>
                {p.name.length > 40 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{name}</span>
                    </TooltipTrigger>
                    <TooltipContent>{p.name}</TooltipContent>
                  </Tooltip>
                ) : (
                  p.name
                )}
              </TableCell>
              <TableCell>
                <span
                  className="rounded px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {PROMOTION_TYPE_LABELS[p.type]}
                </span>
              </TableCell>
              <TableCell>{formatValue(p)}</TableCell>
              <TableCell>
                {p.type === "PROMO_CODE" && p.promo_code ? (
                  <span className="font-mono uppercase text-xs">{p.promo_code}</span>
                ) : null}
              </TableCell>
              <TableCell>
                <Switch
                  checked={p.is_active}
                  onCheckedChange={(checked) =>
                    toggleActive.mutate({ id: p.id, is_active: checked })
                  }
                />
              </TableCell>
              <TableCell className="text-sm">{formatValidWindow(p)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
