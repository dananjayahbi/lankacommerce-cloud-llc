"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon, ChevronDownIcon, PencilIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type { Category } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CategoryTreeProps {
  onSelect?: (category: Category) => void;
}

export function CategoryTree({ onSelect }: CategoryTreeProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`${API_BASE}/api/catalog/categories/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
    },
    onError: () => toast.error("Failed to rename category"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/catalog/categories/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 409) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Cannot delete — products are assigned");
      }
      if (!res.ok) throw new Error("Failed to delete category");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const renderRow = (cat: Category, level = 0) => {
    const children = childrenOf(cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(cat.id);
    const isEditing = editingId === cat.id;
    const count = cat.product_count ?? 0;

    return (
      <div key={cat.id}>
        <div
          className={cn(
            "group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-orange-50/50 cursor-pointer",
            level > 0 && "ml-6",
          )}
          onClick={() => onSelect?.(cat)}
        >
          {/* Expand toggle */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); hasChildren && toggleExpand(cat.id); }}
            className="shrink-0 text-muted-foreground"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )
            ) : (
              <span className="inline-block h-4 w-4" />
            )}
          </button>

          {/* Name / Edit input */}
          {isEditing ? (
            <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameMutation.mutate({ id: cat.id, name: editName });
                  if (e.key === "Escape") cancelEdit();
                }}
                className="flex-1 rounded border border-border px-2 py-0.5 text-sm outline-none focus:border-[var(--color-orange)]"
              />
              <button
                onClick={() => renameMutation.mutate({ id: cat.id, name: editName })}
                className="text-green-600 hover:text-green-700"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button onClick={cancelEdit} className="text-muted-foreground hover:text-destructive">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span className={cn("flex-1 text-sm", level > 0 ? "text-[var(--color-navy)]/80" : "text-[var(--color-navy)] font-medium")}>
              {cat.name}
            </span>
          )}

          {/* Product count */}
          {!isEditing && (
            <span className="text-xs text-muted-foreground">{count}</span>
          )}

          {/* Actions (hover) */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => startEdit(cat)}
                className="rounded p-0.5 text-muted-foreground hover:text-[var(--color-navy)]"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              {count === 0 && (
                <button
                  onClick={() => deleteMutation.mutate(cat.id)}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && children.map((child) => renderRow(child, level + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {topLevel.map((cat) => renderRow(cat))}
      {topLevel.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No categories yet. Add one above.
        </p>
      )}
    </div>
  );
}
