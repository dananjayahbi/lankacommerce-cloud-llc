"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInput } from "@/components/product/TagInput";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { useProductWizardStore } from "@/stores/productWizardStore";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  productStep1Schema,
  type ProductStep1Data,
} from "@/schemas/productSchema";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const GENDER_OPTIONS = [
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "UNISEX", label: "Unisex" },
  { value: "KIDS", label: "Kids" },
  { value: "TODDLERS", label: "Toddlers" },
] as const;

const TAX_RULE_OPTIONS = [
  { value: "STANDARD_VAT", label: "Standard VAT (15%)" },
  { value: "SSCL", label: "SSCL" },
  { value: "VAT_EXEMPT", label: "VAT Exempt" },
] as const;

export function WizardStep1BasicInfo() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { step1Data, setStep1Data, goToStep, resetWizard } =
    useProductWizardStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { data: brands = [], isLoading: brandLoading } = useBrands();

  const [descLength, setDescLength] = useState(0);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductStep1Data>({
    resolver: zodResolver(productStep1Schema),
    defaultValues: {
      name: step1Data.name ?? "",
      description: step1Data.description ?? "",
      category_id: step1Data.category_id ?? undefined,
      brand_id: step1Data.brand_id ?? undefined,
      gender: step1Data.gender,
      tags: step1Data.tags ?? [],
      tax_rule: step1Data.tax_rule ?? "STANDARD_VAT",
    },
  });

  const onSubmit = (data: ProductStep1Data) => {
    setStep1Data(data);
    goToStep(2);
  };

  const handleCancel = () => {
    resetWizard();
    router.push("/inventory");
  };

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch(`${API_BASE}/api/catalog/categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        setValue("category_id", json.data.id);
        setShowCatDialog(false);
        setNewCatName("");
      }
    } finally {
      setSavingCat(false);
    }
  };

  const createBrand = async () => {
    if (!newBrandName.trim()) return;
    setSavingBrand(true);
    try {
      const res = await fetch(`${API_BASE}/api/catalog/brands/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        queryClient.invalidateQueries({ queryKey: ["brands"] });
        setValue("brand_id", json.data.id);
        setShowBrandDialog(false);
        setNewBrandName("");
      }
    } finally {
      setSavingBrand(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Product Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Product Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. Classic Oxford Shirt"
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the product for your staff and for reports."
            rows={3}
            {...register("description", {
              onChange: (e) => setDescLength(e.target.value.length),
            })}
          />
          <p className="text-right text-xs text-muted-foreground">
            {descLength}/1000
          </p>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {catLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.parent_name ? `${cat.parent_name} › ` : ""}
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          />
          <button
            type="button"
            onClick={() => setShowCatDialog(true)}
            className="flex items-center gap-1 text-xs text-[var(--color-orange)] hover:underline"
          >
            <Plus className="h-3 w-3" />
            Create new category
          </button>
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Controller
            control={control}
            name="brand_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {brandLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          />
          <button
            type="button"
            onClick={() => setShowBrandDialog(true)}
            className="flex items-center gap-1 text-xs text-[var(--color-orange)] hover:underline"
          >
            <Plus className="h-3 w-3" />
            Create new brand
          </button>
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label>
            Gender <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      field.value === value
                        ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                        : "border-border text-muted-foreground hover:border-[var(--color-navy)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.gender && (
            <p className="text-xs text-destructive">{errors.gender.message}</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Type a tag and press Enter..."
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Press Enter or comma to add. Maximum 20 tags.
          </p>
        </div>

        {/* Tax Rule */}
        <div className="space-y-1.5">
          <Label>Tax Rule</Label>
          <Controller
            control={control}
            name="tax_rule"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_RULE_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90"
          >
            Next: Add Variants →
          </Button>
        </div>
      </form>

      {/* Inline Category Mini Modal */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCatDialog(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={savingCat || !newCatName.trim()}
                onClick={createCategory}
                className="bg-[var(--color-navy)] text-white"
              >
                {savingCat ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Brand Mini Modal */}
      <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Brand name"
              onKeyDown={(e) => e.key === "Enter" && createBrand()}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBrandDialog(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={savingBrand || !newBrandName.trim()}
                onClick={createBrand}
                className="bg-[var(--color-navy)] text-white"
              >
                {savingBrand ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
