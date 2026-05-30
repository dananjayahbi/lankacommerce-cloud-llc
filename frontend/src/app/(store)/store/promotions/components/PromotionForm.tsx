"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQuery } from "@tanstack/react-query";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/authStore";
import { PROMOTION_TYPE_LABELS } from "./PromotionsTable";
import type { Promotion, PromotionType, PromotionFormValues } from "@/types/promotions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const VALUE_FIELD_CONFIG: Record<PromotionType, { label: string; helper: string }> = {
  CART_PERCENTAGE: {
    label: "Discount (%)",
    helper: "e.g. 10 for 10% off the cart total",
  },
  CATEGORY_PERCENTAGE: {
    label: "Discount (%)",
    helper: "e.g. 15 for 15% off all items in the selected category",
  },
  CART_FIXED: {
    label: "Discount Amount (Rs.)",
    helper: "Fixed amount subtracted from the cart total",
  },
  BOGO: {
    label: "Free Item Value Cap (Rs.)",
    helper: "Maximum value of the free item. Enter 0 to use the item's actual price",
  },
  MIX_AND_MATCH: {
    label: "Discount Amount (Rs.)",
    helper: "Amount discounted when the minimum quantity is met",
  },
  PROMO_CODE: {
    label: "Discount Value",
    helper:
      "Enter a percentage (e.g. 10) or a fixed amount — specify the interpretation in the Description field",
  },
};

const promotionSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    type: z.enum([
      "CART_PERCENTAGE",
      "CART_FIXED",
      "CATEGORY_PERCENTAGE",
      "BOGO",
      "MIX_AND_MATCH",
      "PROMO_CODE",
    ]),
    value: z.string().min(1, "Value is required"),
    promo_code: z.string().optional(),
    target_category_id: z.string().optional(),
    min_quantity: z.string().optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    is_active: z.boolean(),
    description: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "PROMO_CODE") {
        const code = data.promo_code ?? "";
        return code.length >= 3 && code.length <= 50 && /^[A-Z0-9_-]+$/.test(code);
      }
      return true;
    },
    {
      message: "Only uppercase letters, numbers, underscores, and hyphens are allowed (min 3 chars).",
      path: ["promo_code"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "CATEGORY_PERCENTAGE") {
        return !!(data.target_category_id && data.target_category_id.length > 0);
      }
      return true;
    },
    { message: "Category is required for this promotion type.", path: ["target_category_id"] }
  )
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        return new Date(data.ends_at) > new Date(data.starts_at);
      }
      return true;
    },
    { message: "End date must be after start date.", path: ["ends_at"] }
  );

interface Props {
  defaultValues?: Partial<PromotionFormValues>;
  onSubmit: (data: PromotionFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  isEditMode?: boolean;
}

export function PromotionForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  isEditMode = false,
}: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const form = useForm<PromotionFormValues>({
    resolver: standardSchemaResolver(promotionSchema),
    defaultValues: {
      name: "",
      type: "CART_PERCENTAGE",
      value: "",
      promo_code: "",
      target_category_id: "",
      min_quantity: "",
      starts_at: "",
      ends_at: "",
      is_active: true,
      description: "",
      ...defaultValues,
    },
  });

  const watchedType = form.watch("type") as PromotionType;
  const watchedName = form.watch("name");
  const watchedValue = form.watch("value");
  const watchedPromoCode = form.watch("promo_code");
  const watchedMinQty = form.watch("min_quantity");

  const valueConfig = VALUE_FIELD_CONFIG[watchedType] ?? VALUE_FIELD_CONFIG["CART_PERCENTAGE"];

  const { data: categories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["categories-for-promotions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/catalog/categories/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? json ?? [];
    },
    enabled: watchedType === "CATEGORY_PERCENTAGE",
  });

  function previewText(): string {
    const name = watchedName || "Your Promotion Name";
    const val = watchedValue || "0";
    const code = watchedPromoCode?.toUpperCase() || "CODE";
    const qty = watchedMinQty || "2";
    switch (watchedType) {
      case "CART_PERCENTAGE":
        return `${name} — ${val}% off your entire cart.`;
      case "CART_FIXED":
        return `${name} — Rs. ${val} off your cart.`;
      case "CATEGORY_PERCENTAGE": {
        const cat =
          categories?.find((c) => c.id === form.watch("target_category_id"))?.name ??
          "selected category";
        return `${name} — ${val}% off all ${cat} items.`;
      }
      case "BOGO":
        return `${name} — Buy ${qty}, get 1 free (up to Rs. ${val}).`;
      case "MIX_AND_MATCH":
        return `${name} — Mix any ${qty} items and save Rs. ${val}.`;
      case "PROMO_CODE":
        return `Enter code ${code} at checkout to save ${val} off your order.`;
      default:
        return name;
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as Parameters<typeof form.handleSubmit>[0])} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Promotion Name</FormLabel>
              <FormControl>
                <Input {...field} maxLength={255} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isEditMode}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(PROMOTION_TYPE_LABELS) as PromotionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {PROMOTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditMode && (
                <FormDescription style={{ color: "#64748B" }}>
                  Promotion type cannot be changed.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Value */}
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{valueConfig.label}</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={0.01} {...field} />
              </FormControl>
              <FormDescription>{valueConfig.helper}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Promo Code (PROMO_CODE only) */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            watchedType === "PROMO_CODE" ? "max-h-40" : "max-h-0"
          }`}
        >
          <FormField
            control={form.control}
            name="promo_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promo Code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={50}
                    className="font-mono uppercase"
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Category (CATEGORY_PERCENTAGE only) */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            watchedType === "CATEGORY_PERCENTAGE" ? "max-h-40" : "max-h-0"
          }`}
        >
          <FormField
            control={form.control}
            name="target_category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Min Quantity (BOGO / MIX_AND_MATCH only) */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            watchedType === "BOGO" || watchedType === "MIX_AND_MATCH" ? "max-h-40" : "max-h-0"
          }`}
        >
          <FormField
            control={form.control}
            name="min_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min={2} step={1} {...field} />
                </FormControl>
                <FormDescription>
                  {watchedType === "BOGO"
                    ? "Minimum cart quantity to trigger the free item"
                    : "Total items across any qualifying products needed for the discount"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Starts At */}
        <FormField
          control={form.control}
          name="starts_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starts At</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ends At */}
        <FormField
          control={form.control}
          name="ends_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ends At</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} maxLength={500} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Is Active */}
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="mt-0!">Active</FormLabel>
            </FormItem>
          )}
        />

        {/* Live Preview Card */}
        <div
          className="rounded-lg border p-4 space-y-2"
          style={{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }}
        >
          <p
            className="text-xs uppercase tracking-wider"
            style={{ color: "#64748B" }}
          >
            Preview
          </p>
          <p className="text-sm">
            {watchedType === "PROMO_CODE" ? (
              <>
                Enter code{" "}
                <span className="font-mono font-semibold">
                  {(watchedPromoCode || "CODE").toUpperCase()}
                </span>{" "}
                at checkout to save{" "}
                <span className="font-mono">{watchedValue || "0"}</span> off
                your order.
              </>
            ) : (
              <span style={{ color: watchedName ? "#1B2B3A" : "#64748B" }}>
                {previewText()}
              </span>
            )}
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 text-white">
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </form>
    </FormProvider>
  );
}
