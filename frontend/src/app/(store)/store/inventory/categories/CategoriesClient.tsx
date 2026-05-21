"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryTree } from "@/components/categories/CategoryTree";
import { InlineCategoryForm } from "@/components/categories/InlineCategoryForm";
import { useCategories } from "@/hooks/useCategories";
import type { Category } from "@/types/catalog";

export function CategoriesClient() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { data: categories = [] } = useCategories();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <nav className="text-xs text-muted-foreground">
              <Link href="/store/inventory" className="hover:underline">Inventory</Link>
              {" › "}
              <span className="text-[var(--color-navy)]">Categories</span>
            </nav>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-navy)]">Categories</h1>
            <p className="text-sm text-muted-foreground">{categories.length} categories</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-[var(--color-navy)] text-white"
          >
            + New Category
          </Button>
        </div>

        {/* Inline form */}
        {showForm && <InlineCategoryForm onClose={() => setShowForm(false)} />}

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          {/* Category tree - 60% */}
          <div className="rounded-lg border border-border bg-surface p-4 md:col-span-3">
            <CategoryTree onSelect={setSelectedCategory} />
          </div>

          {/* Detail panel - 40% */}
          <div className="rounded-lg border border-border bg-surface p-4 md:col-span-2">
            {selectedCategory ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-[var(--color-navy)]">{selectedCategory.name}</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Parent</dt>
                    <dd>{selectedCategory.parent_name ?? "Top level"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Products</dt>
                    <dd>{selectedCategory.product_count ?? 0}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Select a category to see details
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
