"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { PurchaseOrder, SuppliersListResponse } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Variant search types
// ---------------------------------------------------------------------------

interface CatalogVariant {
  id: string;
  product_name: string;
  description: string;
  cost_price: string;
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const lineSchema = z.object({
  variant_id: z.string().min(1, "Select a variant"),
  product_name_snapshot: z.string(),
  variant_description_snapshot: z.string(),
  ordered_qty: z.number().int().min(1, "Minimum quantity is 1"),
  expected_cost_price: z.string().min(1, "Cost price is required"),
});

const schema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  expected_delivery_date: z.string(),
  notes: z.string(),
  lines: z.array(lineSchema).min(1, "Add at least one line item"),
});

type FormValues = z.infer<typeof schema>;
type LineFormValue = z.infer<typeof lineSchema>;

// ---------------------------------------------------------------------------
// API payload type (exactOptionalPropertyTypes-safe)
// ---------------------------------------------------------------------------

interface POCreatePayload {
  supplier_id: string;
  lines: Array<{
    variant_id: string;
    ordered_qty: number;
    expected_cost_price: string;
  }>;
  expected_delivery_date?: string;
  notes?: string;
}

function buildPayload(values: FormValues): POCreatePayload {
  const payload: POCreatePayload = {
    supplier_id: values.supplier_id,
    lines: values.lines.map((l) => ({
      variant_id: l.variant_id,
      ordered_qty: l.ordered_qty,
      expected_cost_price: l.expected_cost_price,
    })),
  };
  if (values.expected_delivery_date) {
    payload.expected_delivery_date = values.expected_delivery_date;
  }
  if (values.notes) {
    payload.notes = values.notes;
  }
  return payload;
}

// ---------------------------------------------------------------------------
// VariantSearchInput
// ---------------------------------------------------------------------------

interface VariantSearchInputProps {
  accessToken: string | null;
  selectedId: string;
  selectedDisplay: string;
  onSelect: (variant: CatalogVariant) => void;
  onClear: () => void;
}

function VariantSearchInput({
  accessToken,
  selectedId,
  selectedDisplay,
  onSelect,
  onClear,
}: VariantSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogVariant[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const doSearch = useCallback(
    (q: string) => {
      if (!q.trim() || !accessToken) {
        setResults([]);
        setOpen(false);
        return;
      }
      void fetch(
        `${API_BASE}/api/catalog/variants/?q=${encodeURIComponent(q)}&limit=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
        .then((r) => r.json())
        .then((json: unknown) => {
          const data = json as { data?: { results?: CatalogVariant[] }; results?: CatalogVariant[] };
          const variants = data.data?.results ?? data.results ?? [];
          setResults(variants);
          setOpen(variants.length > 0);
        })
        .catch(() => {/* silently ignore search errors */});
    },
    [accessToken],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  // When a variant is already selected, show a chip with clear button
  if (selectedId) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 truncate font-inter text-[#1B2B3A]">
          {selectedDisplay}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-lg leading-none text-[#64748B] hover:text-[#EF4444]"
          aria-label="Clear variant"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleChange}
        placeholder="Search product variant…"
        className="h-9 border-[#E2E8F0] font-inter text-sm"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-[#E2E8F0] bg-white shadow-lg">
          {results.map((v) => (
            <button
              key={v.id}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-[#F1F5F9]"
              onMouseDown={(e) => {
                // Prevent input blur before selection registers
                e.preventDefault();
                setQuery("");
                setResults([]);
                setOpen(false);
                onSelect(v);
              }}
            >
              <span className="font-inter text-sm font-semibold text-[#1B2B3A]">
                {v.product_name}
              </span>
              <span className="font-inter text-xs text-[#64748B]">{v.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default line value
// ---------------------------------------------------------------------------

function emptyLine(): LineFormValue {
  return {
    variant_id: "",
    product_name_snapshot: "",
    variant_description_snapshot: "",
    ordered_qty: 1,
    expected_cost_price: "",
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();

  // ---- Suppliers query ----
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery<SuppliersListResponse>({
    queryKey: ["suppliers-for-po-form"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/suppliers/?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error("Failed to load suppliers");
      return (json as { data: SuppliersListResponse }).data;
    },
    enabled: !!accessToken && can(PERMISSIONS.SUPPLIERS_VIEW),
    staleTime: 60_000,
  });

  // ---- Form ----
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      supplier_id: "",
      expected_delivery_date: "",
      notes: "",
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const watchedLines = watch("lines");
  const watchedSupplierId = watch("supplier_id");

  // ---- Live summary total ----
  const summaryTotal = useMemo(() => {
    try {
      return watchedLines
        .reduce((acc, line) => {
          const qty = line.ordered_qty;
          const price = line.expected_cost_price;
          if (!qty || !price) return acc;
          return acc.plus(new Decimal(price).times(qty));
        }, new Decimal(0))
        .toFixed(2);
    } catch {
      return "0.00";
    }
  }, [watchedLines]);

  const selectedSupplier = useMemo(
    () => suppliersData?.results.find((s) => s.id === watchedSupplierId),
    [suppliersData?.results, watchedSupplierId],
  );

  // ---- Create mutation ----
  const createMutation = useMutation({
    mutationFn: async (values: FormValues): Promise<PurchaseOrder> => {
      const res = await fetch(`${API_BASE}/api/crm/purchase-orders/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(values)),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Failed to create PO",
        );
      }
      const wrapped = json as { data?: PurchaseOrder };
      return wrapped.data ?? (json as PurchaseOrder);
    },
    onSuccess: (created) => {
      toast.success("Purchase order created.");
      void router.push(`/store/suppliers/purchase-orders/${created.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Array-level error message ----
  const linesRootMsg = (() => {
    if (!errors.lines) return undefined;
    const e = errors.lines as unknown as Record<string, unknown>;
    const root = e["root"] as Record<string, unknown> | undefined;
    if (typeof root?.["message"] === "string") return root["message"] as string;
    if (typeof e["message"] === "string") return e["message"] as string;
    return undefined;
  })();

  if (!can(PERMISSIONS.SUPPLIERS_CREATE)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="font-inter text-sm text-[#64748B]">
          You do not have permission to create purchase orders.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-inter text-2xl font-bold text-[#1B2B3A]">New Purchase Order</h1>
        <p className="mt-1 font-inter text-sm text-[#64748B]">
          Create a purchase order and send it to a supplier
        </p>
      </div>

      <form onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ----------------------------------------------------------------
              Left column: order details + lines
          ---------------------------------------------------------------- */}
          <div className="space-y-6 lg:col-span-2">
            {/* Order Details Card */}
            <Card className="border-[#E2E8F0]">
              <CardHeader className="pb-3">
                <CardTitle className="font-inter text-base font-semibold text-[#1B2B3A]">
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier */}
                <div>
                  <Label className="font-inter text-sm font-medium text-[#1B2B3A]">
                    Supplier <span className="text-[#EF4444]">*</span>
                  </Label>
                  {suppliersLoading ? (
                    <Skeleton className="mt-1 h-9 w-full" />
                  ) : (
                    <Controller
                      control={control}
                      name="supplier_id"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={(val) => field.onChange(val ?? "")}>
                          <SelectTrigger className="mt-1 border-[#E2E8F0] font-inter text-sm">
                            <SelectValue placeholder="Select a supplier…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(suppliersData?.results ?? []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                  {errors.supplier_id && (
                    <p className="mt-1 font-inter text-xs text-[#EF4444]">
                      {errors.supplier_id.message}
                    </p>
                  )}
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <Label className="font-inter text-sm font-medium text-[#1B2B3A]">
                    Expected Delivery Date
                  </Label>
                  <Input
                    type="date"
                    {...register("expected_delivery_date")}
                    className="mt-1 border-[#E2E8F0] font-inter text-sm"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label className="font-inter text-sm font-medium text-[#1B2B3A]">Notes</Label>
                  <Textarea
                    {...register("notes")}
                    placeholder="Optional notes for this order…"
                    rows={3}
                    className="mt-1 border-[#E2E8F0] font-inter text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lines Card */}
            <Card className="border-[#E2E8F0]">
              <CardHeader className="pb-3">
                <CardTitle className="font-inter text-base font-semibold text-[#1B2B3A]">
                  Order Lines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {linesRootMsg && (
                  <p className="rounded-md bg-[#FEF2F2] px-3 py-2 font-inter text-xs text-[#EF4444]">
                    {linesRootMsg}
                  </p>
                )}

                {fields.length === 0 && !linesRootMsg && (
                  <p className="font-inter text-sm text-[#64748B]">
                    No lines added yet. Click &quot;Add Line&quot; to begin.
                  </p>
                )}

                {fields.map((field, index) => {
                  const currentLine = watchedLines[index] as LineFormValue | undefined;
                  const selectedId = currentLine?.variant_id ?? "";
                  const selectedDisplay = currentLine?.variant_description_snapshot
                    ? `${currentLine.product_name_snapshot} · ${currentLine.variant_description_snapshot}`
                    : (currentLine?.product_name_snapshot ?? "");

                  // Line-level errors
                  type LinePropErrors = Partial<Record<keyof LineFormValue, { message?: string }>>;
                  const lineErrs = errors.lines as Array<LinePropErrors | undefined> | undefined;
                  const lineErr = lineErrs?.[index];

                  return (
                    <div
                      key={field.id}
                      className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                    >
                      {/* Line header */}
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-inter text-sm font-semibold text-[#1B2B3A]">
                          Line {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded p-1 text-[#64748B] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444]"
                          aria-label="Remove line"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Variant search */}
                      <div className="mb-3">
                        <Label className="font-inter text-xs font-medium text-[#64748B]">
                          Product Variant <span className="text-[#EF4444]">*</span>
                        </Label>
                        <div className="mt-1">
                          <Controller
                            control={control}
                            name={`lines.${index}.variant_id`}
                            render={() => (
                              <VariantSearchInput
                                accessToken={accessToken}
                                selectedId={selectedId}
                                selectedDisplay={selectedDisplay}
                                onSelect={(v) => {
                                  setValue(`lines.${index}.variant_id`, v.id, {
                                    shouldValidate: true,
                                  });
                                  setValue(
                                    `lines.${index}.product_name_snapshot`,
                                    v.product_name,
                                  );
                                  setValue(
                                    `lines.${index}.variant_description_snapshot`,
                                    v.description,
                                  );
                                  const existing = watchedLines[index] as
                                    | LineFormValue
                                    | undefined;
                                  if (!existing?.expected_cost_price) {
                                    setValue(
                                      `lines.${index}.expected_cost_price`,
                                      v.cost_price,
                                    );
                                  }
                                }}
                                onClear={() => {
                                  setValue(`lines.${index}.variant_id`, "");
                                  setValue(`lines.${index}.product_name_snapshot`, "");
                                  setValue(`lines.${index}.variant_description_snapshot`, "");
                                }}
                              />
                            )}
                          />
                        </div>
                        {lineErr?.variant_id?.message && (
                          <p className="mt-1 font-inter text-xs text-[#EF4444]">
                            {lineErr.variant_id.message}
                          </p>
                        )}
                      </div>

                      {/* Qty + Cost Price */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="font-inter text-xs font-medium text-[#64748B]">
                            Ordered Qty <span className="text-[#EF4444]">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            {...register(`lines.${index}.ordered_qty`, {
                              valueAsNumber: true,
                            })}
                            className="mt-1 border-[#E2E8F0] font-mono text-sm"
                          />
                          {lineErr?.ordered_qty?.message && (
                            <p className="mt-1 font-inter text-xs text-[#EF4444]">
                              {lineErr.ordered_qty.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="font-inter text-xs font-medium text-[#64748B]">
                            Expected Cost Price <span className="text-[#EF4444]">*</span>
                          </Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...register(`lines.${index}.expected_cost_price`)}
                            className="mt-1 border-[#E2E8F0] font-mono text-sm"
                          />
                          {lineErr?.expected_cost_price?.message && (
                            <p className="mt-1 font-inter text-xs text-[#EF4444]">
                              {lineErr.expected_cost_price.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Line Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append(emptyLine())}
                  className="w-full border-dashed border-[#E2E8F0] font-inter text-sm text-[#64748B] hover:border-[#F97316] hover:text-[#F97316]"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-[#F97316] font-inter text-white hover:bg-[#EA6C0A] disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating…" : "Create Purchase Order"}
              </Button>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              Right column: live summary
          ---------------------------------------------------------------- */}
          <div>
            <Card className="sticky top-6 border-[#E2E8F0]">
              <CardHeader className="pb-3">
                <CardTitle className="font-inter text-base font-semibold text-[#1B2B3A]">
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Supplier */}
                <div className="mb-4">
                  <p className="font-inter text-xs font-medium uppercase tracking-wide text-[#64748B]">
                    Supplier
                  </p>
                  <p className="mt-0.5 font-inter text-sm font-semibold text-[#1B2B3A]">
                    {selectedSupplier?.name ?? (
                      <span className="font-normal text-[#64748B]">Not selected</span>
                    )}
                  </p>
                </div>

                {/* Lines */}
                {watchedLines.length === 0 ? (
                  <p className="font-inter text-sm text-[#64748B]">No lines added</p>
                ) : (
                  <div className="space-y-2">
                    {watchedLines.map((line, i) => {
                      const qty = line.ordered_qty ?? 0;
                      const price = line.expected_cost_price ?? "";
                      let subtotal = "0.00";
                      try {
                        if (qty > 0 && price) {
                          subtotal = new Decimal(price).times(qty).toFixed(2);
                        }
                      } catch {
                        /* invalid decimal — keep 0.00 */
                      }
                      return (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <span className="font-inter text-xs leading-snug text-[#64748B]">
                            {line.product_name_snapshot || `Line ${i + 1}`} × {qty}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-[#1B2B3A]">
                            Rs.{subtotal}
                          </span>
                        </div>
                      );
                    })}

                    {/* Total */}
                    <div className="mt-3 border-t border-[#E2E8F0] pt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-sm font-semibold text-[#1B2B3A]">
                          Total
                        </span>
                        <span className="font-mono text-sm font-bold text-[#1B2B3A]">
                          Rs.{summaryTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </main>
  );
}
