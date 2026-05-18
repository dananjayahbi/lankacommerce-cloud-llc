"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface InlineCategoryFormProps {
  onClose: () => void;
}

export function InlineCategoryForm({ onClose }: InlineCategoryFormProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [error, setError] = useState("");

  const topLevel = categories.filter((c) => !c.parent_id);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          parent_id: parentId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
      onClose();
    },
    onError: () => toast.error("Failed to create category"),
  });

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (name.trim().length > 50) {
      setError("Name must be at most 50 characters");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Parent Category (optional)</Label>
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Top level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None (top level)</SelectItem>
              {topLevel.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Category Name *</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. T-Shirts"
            className="h-8"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            size="sm"
            className="bg-[var(--color-navy)] text-white"
          >
            {mutation.isPending ? "Adding..." : "Add Category"}
          </Button>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
