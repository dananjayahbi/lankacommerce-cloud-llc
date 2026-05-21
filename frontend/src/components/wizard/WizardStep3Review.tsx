"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProductWizardStore } from "@/stores/productWizardStore";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function WizardStep3Review() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { step1Data, step2Data, goToStep, resetWizard } = useProductWizardStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categories.find((c) => c.id === step1Data.category_id);
  const brand = brands.find((b) => b.id === step1Data.brand_id);
  const selectedVariants = (step2Data.variants ?? []).filter((v) => v.selected);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: step1Data.name,
        description: step1Data.description,
        gender: step1Data.gender,
        tax_rule: step1Data.tax_rule,
        tags: step1Data.tags ?? [],
        category_id: step1Data.category_id ?? null,
        brand_id: step1Data.brand_id ?? null,
        variant_definitions: selectedVariants.map((v) => ({
          sku: v.sku,
          size: v.size || null,
          colour: v.colour || null,
          cost_price: v.costPrice ? parseFloat(v.costPrice) : null,
          retail_price: parseFloat(v.retailPrice),
          wholesale_price: v.wholesalePrice ? parseFloat(v.wholesalePrice) : null,
          low_stock_threshold: v.lowStockThreshold ?? 5,
        })),
      };

      const res = await fetch(`${API_BASE}/api/catalog/products/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to create product");
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetWizard();
      router.push("/store/inventory");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <h3 className="font-semibold text-[var(--color-navy)]">Product Details</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Name</dt>
            <dd className="font-medium text-[var(--color-navy)]">{step1Data.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Gender</dt>
            <dd>{step1Data.gender}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Category</dt>
            <dd>{category?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Brand</dt>
            <dd>{brand?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Tax Rule</dt>
            <dd>{step1Data.tax_rule}</dd>
          </div>
          {step1Data.tags && step1Data.tags.length > 0 && (
            <div className="col-span-2">
              <dt className="text-xs uppercase text-muted-foreground">Tags</dt>
              <dd className="flex flex-wrap gap-1 mt-1">
                {step1Data.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--color-navy)] px-2 py-0.5 text-xs text-white">
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {selectedVariants.length} Variant{selectedVariants.length !== 1 ? "s" : ""}
        </h3>
        <div className="divide-y divide-border">
          {selectedVariants.slice(0, 10).map((v, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>
              <span className="text-muted-foreground">{v.size}{v.colour ? ` / ${v.colour}` : ""}</span>
              <span className="font-medium">Rs. {parseFloat(v.retailPrice).toFixed(2)}</span>
            </div>
          ))}
          {selectedVariants.length > 10 && (
            <p className="py-2 text-xs text-muted-foreground text-center">
              +{selectedVariants.length - 10} more variants
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => goToStep(2)}>
          ← Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90"
        >
          {isSubmitting ? "Creating Product..." : "Create Product"}
        </Button>
      </div>
    </div>
  );
}
