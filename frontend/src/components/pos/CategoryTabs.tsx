"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/types/catalog";

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <div
      className="flex shrink-0 gap-2 overflow-x-auto px-4 py-2"
      style={{
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}
    >
      {/* All Products tab */}
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-1.5 font-inter text-[13px] font-medium transition-all duration-150 ease-in-out",
          selectedCategoryId === null
            ? "border-[#F97316] bg-[#F97316] text-white"
            : "border-[#E2E8F0] text-[#64748B] hover:border-[#F97316] hover:text-[#F97316]",
        )}
      >
        All Products
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelectCategory(cat.id)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 font-inter text-[13px] font-medium transition-all duration-150 ease-in-out",
            selectedCategoryId === cat.id
              ? "border-[#F97316] bg-[#F97316] text-white"
              : "border-[#E2E8F0] text-[#64748B] hover:border-[#F97316] hover:text-[#F97316]",
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
