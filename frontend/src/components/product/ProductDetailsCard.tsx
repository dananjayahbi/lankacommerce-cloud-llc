"use client";

import { useState } from "react";
import type { Product } from "@/types/catalog";

interface ProductDetailsCardProps {
  product: Product;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProductDetailsCard({ product }: ProductDetailsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const desc = product.description ?? "";
  const isLong = desc.length > 200;
  const displayDesc = isLong && !expanded ? desc.slice(0, 200) + "…" : desc;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-muted-foreground">Name</dt>
          <dd className="mt-1 text-sm font-medium text-[var(--color-navy)]">{product.name}</dd>
        </div>

        {desc && (
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Description</dt>
            <dd className="mt-1 text-sm text-[var(--color-navy)]">
              {displayDesc}
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1 text-xs text-[var(--color-orange)] hover:underline"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </dd>
          </div>
        )}

        <div>
          <dt className="text-xs font-semibold uppercase text-muted-foreground">Gender</dt>
          <dd className="mt-1 text-sm">{product.gender}</dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase text-muted-foreground">Tax Rule</dt>
          <dd className="mt-1 text-sm">{product.tax_rule}</dd>
        </div>

        {product.category_name && (
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Category</dt>
            <dd className="mt-1 text-sm">
              <a
                href="/inventory/categories"
                className="text-[var(--color-orange)] hover:underline"
              >
                {product.category_name}
              </a>
            </dd>
          </div>
        )}

        {product.brand_name && (
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Brand</dt>
            <dd className="mt-1 text-sm">
              <a
                href="/inventory/brands"
                className="text-[var(--color-orange)] hover:underline"
              >
                {product.brand_name}
              </a>
            </dd>
          </div>
        )}

        {product.tags && product.tags.length > 0 && (
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Tags</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {product.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </dd>
          </div>
        )}

        {(product as any).created_at && (
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
            <dd className="mt-1 text-sm">{formatDate((product as any).created_at)}</dd>
          </div>
        )}

        {(product as any).updated_at && (
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Last Modified</dt>
            <dd className="mt-1 text-sm">{formatDate((product as any).updated_at)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
